import os
import time
import threading
import uuid
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
import networkx as nx
from dotenv import load_dotenv
# --- CONFIGURATION ---
from dotenv import load_dotenv
load_dotenv()

import quota_manager
quota_manager.init_db()

IBM_TOKEN = os.getenv("IBM_TOKEN")
DWAVE_TOKEN = os.getenv("DWAVE_TOKEN")

app = Flask(__name__)
ALLOWED_ORIGINS = [
    "https://quantum.pratuldeshpande.com",
    "https://pratuldeshpande.github.io",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
if os.getenv("FRONTEND_URL"):
    ALLOWED_ORIGINS.append(os.getenv("FRONTEND_URL"))
CORS(app, resources={r"/*": {"origins": ALLOWED_ORIGINS}})

# --- IMPORTS (Safe Loading) ---
QISKIT_AVAILABLE = False
try:
    from qiskit.circuit.library import QAOAAnsatz
    from qiskit_optimization.converters import QuadraticProgramToQubo
    from qiskit_ibm_runtime import QiskitRuntimeService
    QISKIT_AVAILABLE = True
except ImportError:
    print("⚠️ Qiskit not installed. (Cloud/Local Quantum disabled)")

DWAVE_AVAILABLE = False
try:
    # pyrefly: ignore [missing-import]
    from dwave.system import LeapHybridSampler
    # pyrefly: ignore [missing-import]
    import dwave_networkx as dnx
    DWAVE_AVAILABLE = True
except ImportError:
    print("⚠️ D-Wave not installed. (Cloud Annealer disabled)")

# --- JOB STORE ---
from threading import Lock
jobs_db = {}
jobs_lock = Lock()
JOB_TTL_SECONDS = 600  # 10 minutes

def cleanup_old_jobs():
    """Remove jobs older than TTL to prevent unbounded memory growth."""
    now = time.time()
    expired = [jid for jid, data in jobs_db.items() if now - data.get('created_at', 0) > JOB_TTL_SECONDS]
    for jid in expired:
        del jobs_db[jid]
    if expired:
        print(f"🧹 Cleaned up {len(expired)} expired jobs.")

import requests

def calculate_distance_matrix(locations):
    n = len(locations)
    matrix = np.zeros((n, n))
    
    # Try OSRM API First
    try:
        coords = ";".join([f"{loc['lng']},{loc['lat']}" for loc in locations])
        url = f"https://router.project-osrm.org/table/v1/driving/{coords}?annotations=distance"
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            data = res.json()
            if 'distances' in data:
                # OSRM returns meters, convert to km
                matrix = np.array(data['distances']) / 1000.0
                return matrix
    except Exception as e:
        print(f"OSRM Fetch failed: {e}. Falling back to Haversine.")
        
    # Fallback to Haversine (Euclidean)
    R = 6371  # Earth radius in km
    for i in range(n):
        for j in range(n):
            if i != j:
                lat1, lon1 = locations[i]['lat'], locations[i]['lng']
                lat2, lon2 = locations[j]['lat'], locations[j]['lng']
                dlat = np.radians(lat2 - lat1)
                dlon = np.radians(lon2 - lon1)
                a = (np.sin(dlat / 2) ** 2 +
                     np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) *
                     np.sin(dlon / 2) ** 2)
                dist = R * 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
                matrix[i][j] = dist
    return matrix

class AsymmetricTsp:
    def __init__(self, adj_matrix):
        self.adj_matrix = np.array(adj_matrix)
        self.n = len(self.adj_matrix)

    def to_quadratic_program(self):
        from qiskit_optimization import QuadraticProgram
        qp = QuadraticProgram()
        for i in range(self.n):
            for p in range(self.n):
                qp.binary_var(f'x_{i}_{p}')
        obj_quad = {}
        for i in range(self.n):
            for j in range(self.n):
                if i != j:
                    for p in range(self.n):
                        v1 = f'x_{i}_{p}'
                        v2 = f'x_{j}_{(p+1)%self.n}'
                        obj_quad[(v1, v2)] = self.adj_matrix[i, j]
        qp.minimize(quadratic=obj_quad)
        for i in range(self.n):
            qp.linear_constraint(linear={f'x_{i}_{p}': 1 for p in range(self.n)}, sense='==', rhs=1, name=f'n_{i}')
        for p in range(self.n):
            qp.linear_constraint(linear={f'x_{i}_{p}': 1 for i in range(self.n)}, sense='==', rhs=1, name=f'p_{p}')
        return qp

    def interpret(self, result):
        if len(result) != self.n**2:
            raise ValueError('Invalid result length')
        x = np.array(result).reshape((self.n, self.n))
        route = []
        for p in range(self.n):
            node = np.argmax(x[:, p])
            route.append(int(node))
        return route

def validate_and_fix_route(route, num_nodes):
    """Ensure the route is a valid TSP tour visiting all nodes exactly once."""
    expected = set(range(num_nodes))
    try:
        actual = set(route)
    except TypeError:
        actual = set()
    
    if actual != expected or len(route) != num_nodes:
        print(f"⚠️ Invalid route detected: {route}. Falling back to sequential.")
        return list(range(num_nodes))
    
    # Rotate so node 0 is first
    if 0 in route:
        idx_0 = route.index(0)
        route = route[idx_0:] + route[:idx_0]
    
    return route

# --- SOLVER FUNCTIONS ---

def run_dwave_solver(dist_matrix):
    if not (DWAVE_AVAILABLE and DWAVE_TOKEN):
        raise Exception("D-Wave Token missing or library not installed.")
    print("🌊 Executing on D-Wave Leap...")

    import dimod

    n = len(dist_matrix)
    Q = {}
    penalty = float(np.max(dist_matrix)) * n * 2

    def idx(city, pos):
        return city * n + pos

    # Objective: minimize travel cost
    for i in range(n):
        for j in range(n):
            if i != j:
                for p in range(n):
                    qi = idx(i, p)
                    qj = idx(j, (p + 1) % n)
                    Q[(qi, qj)] = Q.get((qi, qj), 0) + dist_matrix[i][j]

    # Constraint 1: Each city visited exactly once
    for i in range(n):
        for p in range(n):
            qi = idx(i, p)
            Q[(qi, qi)] = Q.get((qi, qi), 0) - penalty
            for p2 in range(p + 1, n):
                qi2 = idx(i, p2)
                Q[(qi, qi2)] = Q.get((qi, qi2), 0) + 2 * penalty

    # Constraint 2: Each position has exactly one city
    for p in range(n):
        for i in range(n):
            qi = idx(i, p)
            Q[(qi, qi)] = Q.get((qi, qi), 0) - penalty
            for i2 in range(i + 1, n):
                qi2 = idx(i2, p)
                Q[(qi, qi2)] = Q.get((qi, qi2), 0) + 2 * penalty

    bqm = dimod.BinaryQuadraticModel.from_qubo(Q)
    sampler = LeapHybridSampler(token=DWAVE_TOKEN)
    result = sampler.sample(bqm, label="QuantumMaps ATSP")
    best = result.first.sample

    route = []
    for p in range(n):
        for i in range(n):
            if best.get(idx(i, p), 0) == 1:
                route.append(i)
                break

    return route, "D-Wave Quantum Annealer (ATSP)"

def run_ibm_cloud_solver(dist_matrix):
    """Real QAOA on IBM Quantum hardware using V2 Primitives + Session."""
    if not (QISKIT_AVAILABLE and IBM_TOKEN):
        raise Exception("IBM Token missing or Qiskit not installed.")
    print("☁️ Executing QAOA on IBM Quantum Cloud...")

    from scipy.optimize import minimize
    from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager

    tsp = AsymmetricTsp(dist_matrix)
    qp = tsp.to_quadratic_program()
    qubo = QuadraticProgramToQubo().convert(qp)
    hamiltonian, offset = qubo.to_ising()

    num_qubits = hamiltonian.num_qubits
    reps = 3 if num_qubits <= 20 else 2
    ansatz = QAOAAnsatz(hamiltonian, reps=reps)

    try:
        service = QiskitRuntimeService(channel="ibm_quantum", token=IBM_TOKEN)
    except Exception:
        service = QiskitRuntimeService(channel="ibm_cloud", token=IBM_TOKEN)
    backend = service.least_busy(operational=True, simulator=False, min_num_qubits=num_qubits)

    # 1. Local Optimization to bypass cloud queues
    print("☁️ Optimizing parameters locally to avoid cloud queues...")
    from qiskit_aer.primitives import EstimatorV2 as AerEstimator
    local_ansatz = QAOAAnsatz(hamiltonian, reps=reps).decompose(reps=3)
    local_estimator = AerEstimator(options={"run_options": {"shots": None, "exact_pauli_expectation": True}})
    initial_params = np.random.uniform(0, np.pi, local_ansatz.num_parameters)
    
    def local_cost_func(params):
        pub = (local_ansatz, [hamiltonian], [params])
        return local_estimator.run([pub]).result()[0].data.evs[0]

    opt_result = minimize(
        fun=local_cost_func,
        x0=initial_params,
        method="COBYLA",
        options={"maxiter": 50}
    )
    
    # 2. Cloud Execution (Single Job)
    print(f"☁️ Submitting single optimized sampling job to {backend.name}...")
    pm = generate_preset_pass_manager(target=backend.target, optimization_level=3)
    isa_circuit = pm.run(ansatz)
    
    from qiskit_ibm_runtime import SamplerV2
    meas_circuit = isa_circuit.copy()
    meas_circuit.measure_all()
    
    sampler = SamplerV2(mode=backend)
    sample_job = sampler.run([(meas_circuit, opt_result.x)])
    
    try:
        sample_result = sample_job.result(timeout=300)[0]
    except Exception as timeout_err:
        print(f"IBM job timed out: {timeout_err}")
        raise Exception("IBM Quantum job timed out after 5 minutes. Try again later.")

    counts = sample_result.data.meas.get_counts()
    best_bitstring = max(counts, key=counts.get)
    x = np.array([int(bit) for bit in best_bitstring])

    try:
        route = tsp.interpret(x)
        if len(route) != len(dist_matrix):
            raise ValueError("Invalid route length")
        if set(route) != set(range(len(dist_matrix))):
            raise ValueError("Invalid nodes in route")
    except Exception as e:
        print(f"QAOA route invalid ({e}), using greedy fallback.")
        G = nx.from_numpy_array(dist_matrix)
        route = nx.approximation.greedy_tsp(G, source=0)

    return list(route), f"QAOA (reps={reps}) on {backend.name}"

def run_local_simulator(dist_matrix):
    """Real QAOA on local StatevectorSampler."""
    if not QISKIT_AVAILABLE:
        raise Exception("Qiskit not installed.")
    print("💻 Executing QAOA on Local Simulator...")

    try:
        from qiskit_aer.primitives import EstimatorV2 as AerEstimator, SamplerV2 as AerSampler
        estimator = AerEstimator(options={"run_options": {"shots": None, "exact_pauli_expectation": True}})
        sampler = AerSampler(options={"run_options": {"shots": 1024}})
        sim_name = "AerSimulator"
    except ImportError:
        from qiskit.primitives import StatevectorEstimator, StatevectorSampler
        estimator = StatevectorEstimator()
        sampler = StatevectorSampler()
        sim_name = "Statevector"
    num_nodes = len(dist_matrix)
    if num_nodes > 5:
        raise Exception(f"Local QAOA cannot simulate {num_nodes} nodes ({num_nodes**2} qubits). Max is 5.")
        
    tsp = AsymmetricTsp(dist_matrix)
    qp = tsp.to_quadratic_program()
    qubo = QuadraticProgramToQubo().convert(qp)
    hamiltonian, offset = qubo.to_ising()

    # Dynamic scaling: smaller graph = more reps/iters. Larger = fewer reps/iters to prevent hanging.
    if num_nodes <= 3:
        reps, maxiter = 3, 100
    elif num_nodes == 4:
        reps, maxiter = 2, 50
    else:
        reps, maxiter = 1, 25

    ansatz = QAOAAnsatz(hamiltonian, reps=reps).decompose(reps=3)

    from scipy.optimize import minimize
    def cost_func(params):
        pub = (ansatz, [hamiltonian], [params])
        result = estimator.run([pub]).result()[0]
        return result.data.evs[0]

    initial_params = np.random.uniform(0, np.pi, ansatz.num_parameters)

    opt_result = minimize(cost_func, initial_params, method="COBYLA", options={"maxiter": maxiter})

    meas_circuit = ansatz.copy()
    meas_circuit.measure_all()
    sample_result = sampler.run([(meas_circuit, opt_result.x)]).result()[0]

    counts = sample_result.data.meas.get_counts()
    best_bitstring = max(counts, key=counts.get)
    x = np.array([int(bit) for bit in best_bitstring])

    try:
        route = tsp.interpret(x)
        if len(route) != len(dist_matrix):
            raise ValueError("Invalid route length")
        if set(route) != set(range(len(dist_matrix))):
            raise ValueError("Invalid nodes in route")
    except Exception as e:
        print(f"QAOA route invalid ({e}), using greedy fallback.")
        G = nx.from_numpy_array(dist_matrix)
        route = nx.approximation.greedy_tsp(G, source=0)

    return list(route), f"QAOA {sim_name} (reps={reps})"

# --- MAIN WORKER LOGIC ---
def background_worker(job_id, locations, solver_mode, quota_exceeded_flag=False):
    try:
        num_nodes = len(locations)
        dist_matrix = calculate_distance_matrix(locations)
        route = []
        method = ""
        
        print(f"Job {job_id}: Starting Mode [{solver_mode}]")

        try:
            if solver_mode == 'cloud':
                try:
                    route, method = run_dwave_solver(dist_matrix)
                except Exception as dwave_err:
                    print(f"D-Wave skipped: {dwave_err}")
                    route, method = run_ibm_cloud_solver(dist_matrix)
            elif solver_mode == 'local':
                route, method = run_local_simulator(dist_matrix)
            else:
                raise Exception(f"Unknown solver mode: {solver_mode}")

        except Exception as quantum_err:
            print(f"Quantum failed ({solver_mode}): {quantum_err}")
            print("⚠️ Falling back to Classical Greedy")
            G = nx.from_numpy_array(dist_matrix)
            route = nx.approximation.greedy_tsp(G, source=0)
            method = "Classical Fallback (Quantum Failed)"

        if quota_exceeded_flag:
            method += " (Cloud Quota Exceeded - Routed Locally)"

        # greedy_tsp returns a cycle [0, 2, 1, 0] — strip trailing duplicate
        if len(route) > 0 and route[0] == route[-1]:
            route = route[:-1]
        route = validate_and_fix_route(route, num_nodes)
            
        energy = 0
        for i in range(len(route)-1):
            energy += dist_matrix[route[i]][route[i+1]]
        energy += dist_matrix[route[-1]][route[0]]
        
        with jobs_lock:
            jobs_db[job_id] = {
                "status": "completed",
                "result": { "route": list(route), "method": method, "energy": float(energy) }
            }
        print(f"Job {job_id} Finished via {method}")
        
    except Exception as e:
        print(f"Critical Job Error: {e}")
        with jobs_lock:
            jobs_db[job_id] = {"status": "failed", "error": str(e)}

# --- ENDPOINTS ---
@app.route('/solve', methods=['POST'])
def start_solve():
    data = request.json
    if not data:
        return jsonify({'error': 'Invalid JSON body'}), 400
    locations = data.get('locations', [])
    solver_mode = data.get('solver_mode', 'local') 
    
    if len(locations) < 2:
        return jsonify({'error': 'Need at least 2 locations'}), 400
    if len(locations) > 12:
        return jsonify({'error': 'Maximum 12 locations supported (quantum hardware limit)'}), 400
    if solver_mode not in ('cloud', 'local'):
        return jsonify({'error': f'Invalid solver_mode: {solver_mode}'}), 400
        
    for i, loc in enumerate(locations):
        try:
            lat = float(loc.get('lat', None))
            lng = float(loc.get('lng', None))
            if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
                raise ValueError
        except (TypeError, ValueError):
            return jsonify({'error': f'Invalid coordinates at location {i}'}), 400

    quota_exceeded_flag = False
    if solver_mode == 'cloud':
        ip_addr = request.remote_addr
        allowed, msg = quota_manager.check_and_consume_quota(ip_addr)
        if not allowed:
            print(f"Quota exceeded for {ip_addr}: {msg}. Falling back to local.")
            solver_mode = 'local'
            quota_exceeded_flag = True

    job_id = str(uuid.uuid4())
    with jobs_lock:
        cleanup_old_jobs()
        jobs_db[job_id] = {"status": "pending", "created_at": time.time()}
    
    thread = threading.Thread(target=background_worker, args=(job_id, locations, solver_mode, quota_exceeded_flag))
    thread.start()
    
    return jsonify({"job_id": job_id, "status": "pending"})

@app.route('/status/<job_id>', methods=['GET'])
def get_status(job_id):
    with jobs_lock:
        job = jobs_db.get(job_id)
    if not job: return jsonify({"error": "Job not found"}), 404
    return jsonify(job)

@app.route('/', methods=['GET'])
def health_check():
    return "Quantum Backend Operational", 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 7860))
    app.run(host='0.0.0.0', port=port)



"""
# 1. Activate the virtual environment
.\Qvenv\Scripts\activate
# 2. Start the backend
python qaoa_backend.py
"""