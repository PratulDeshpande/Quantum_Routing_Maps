# 🌌 QuantumMaps: Quantum Logistics for the Real World

<div align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" />
  <img src="https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white" />
  <img src="https://img.shields.io/badge/Qiskit-6929C4?style=for-the-badge&logo=qiskit&logoColor=white" />
  <img src="https://img.shields.io/badge/D--Wave-022B55?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
</div>

<br />

> **QuantumMaps** is an advanced, production-grade logistics application that bridges the gap between theoretical quantum physics and real-world geographical routing. It leverages **Quantum Approximate Optimization Algorithms (QAOA)** on IBM's Gate-Model Quantum Computers and **Quantum Annealing** on D-Wave Systems to solve the deeply complex **Asymmetric Traveling Salesman Problem (ATSP)** over real-world road networks.

---

## 📖 Table of Contents
1. [The Vision & The Problem](#-the-vision--the-problem)
2. [Core Quantum Architecture](#-core-quantum-architecture)
3. [Classical Tech Stack](#-classical-tech-stack)
4. [System Architecture (Data Flow)](#-system-architecture-data-flow)
5. [Local Development Setup](#-local-development-setup)
6. [Cloud Deployment Architecture](#-cloud-deployment-architecture)
7. [Security & Quota Management](#-security--quota-management)
8. [Future Roadmap](#-future-roadmap)

---

## 🎯 The Vision & The Problem

Most introductory quantum computing projects demonstrate the Traveling Salesman Problem (TSP) using a mathematically simple **Symmetric Euclidean Distance**. This means the cost to travel from Point A to Point B is identical to traveling from Point B to Point A, because it assumes a straight line. 

In the real world, logistics are **Asymmetric**. Driving from a warehouse to a drop-off point might take 5 minutes, but returning might take 15 minutes due to one-way streets, traffic topography, or highway exit placements. 

**QuantumMaps solves this by interfacing directly with the Open Source Routing Machine (OSRM).** It fetches highly accurate, real-world driving times and topographical polyline geometries, injects them directly into a Quantum Hamiltonian, and maps one-way streets into a true Asymmetric QUBO formulation.

---

## 🔬 Core Quantum Architecture

### 1. The Custom ATSP QUBO Engine
Because native quantum libraries (like Qiskit's `Tsp` application) mathematically enforce symmetry, passing them real-world asymmetric data causes them to silently discard half of the matrix. 

To achieve true logistics realism, we built a **Custom Quadratic Unconstrained Binary Optimization (QUBO) Engine** from scratch:

- **Qubit Allocation:** We allocate $N^2$ binary variables $x_{i,p}$, where $x_{i,p} = 1$ if city $i$ is visited at step $p$ in the route.
- **The Objective Function (Cost):** We map the OSRM asymmetric driving times ($c_{ij}$) directly to the quantum program:
   $$ \text{Minimize: } \sum_{i \neq j} c_{ij} \sum_{p=0}^{N-1} x_{i,p} \cdot x_{j, (p+1) \bmod N} $$
- **The Constraints (Energy Penalties):** We apply massive mathematical energy penalties to the Hamiltonian to ensure the quantum state collapses *only* on valid routes:
  1. Every node must be visited exactly once.
  2. Every step in the timeline must contain exactly one node.

### 2. The Quantum Execution Environments
The backend dynamically selects the execution environment based on the user's preference and the problem size:

1. **Local Statevector Simulation (Qiskit Aer):** Uses a local CPU to simulate the quantum wavefunction. To prevent Out-of-Memory (OOM) crashes on 16GB RAM cloud containers, this is heavily optimized and hard-capped.
2. **IBM Quantum Cloud (QAOA):** Transpiles the Hamiltonian into microwave control pulses, executing the QAOA Ansatz via Qiskit's `SamplerV2` and `EstimatorV2` primitives on real IBM supercomputing hardware. We utilize `COBYLA` to optimize the variational parameters $\gamma$ and $\beta$.
3. **D-Wave Quantum Annealer:** Maps the exact QUBO formulation onto a physical lattice of superconducting flux qubits, using quantum tunneling to find the absolute lowest energy state (the fastest route) almost instantaneously.

---

## 💻 Classical Tech Stack

### Frontend (Client-Side)
- **React.js 19 & Vite:** Lightning-fast rendering and Hot Module Replacement.
- **React-Leaflet:** Highly interactive, mobile-responsive map layer.
- **Mapbox Polyline Algorithm:** Decodes Google's highly compressed Polyline strings returned by OSRM to physically render dense, curving road geometries that snap perfectly to the streets.
- **Tailwind CSS:** Powers the sleek, glassmorphism UI, real-time telemetry panels, and fluid micro-animations.

### Backend (Server-Side)
- **Flask & Gunicorn:** A multi-threaded REST API gateway capable of background job processing.
- **Qiskit & SciPy:** Used to generate the Quantum circuits and optimize the variational parameters.
- **D-Wave Ocean SDK:** Interfaces with the `LeapHybridSampler`.
- **OSRM API (`requests`):** Fetches the real-world distance matrices and topographical route geometry.
- **Psycopg2:** Connects to the cloud PostgreSQL database.

---

## 🏗️ System Architecture (Data Flow)

```mermaid
sequenceDiagram
    participant User (React)
    participant Flask Backend
    participant OSRM API
    participant Quantum QPU
    participant Supabase DB

    User (React)->>Flask Backend: POST /api/solve (Coordinates)
    Flask Backend->>Supabase DB: Verify Quota & IP Limits
    Supabase DB-->>Flask Backend: OK (Quota Consumed)
    
    Flask Backend->>OSRM API: Request Asymmetric Distance Matrix
    OSRM API-->>Flask Backend: JSON (Driving times in seconds)
    
    Flask Backend->>Flask Backend: Map to N² QUBO Hamiltonian
    
    Flask Backend->>Quantum QPU: Dispatch Job (IBM QAOA or D-Wave)
    Quantum QPU-->>Flask Backend: Return Lowest Energy Bitstring
    
    Flask Backend->>Flask Backend: Decode Bitstring to Route Sequence
    
    Flask Backend->>OSRM API: Fetch Polyline Geometry for Route
    OSRM API-->>Flask Backend: Encoded Polyline String
    
    Flask Backend-->>User (React): Return Sequence & Geometry
    User (React)->>User (React): Decode Polyline & Render on Map
```

---

## 🚀 Local Development Setup

To run QuantumMaps locally on your machine, follow these steps:

### 1. Backend Setup
```bash
# Navigate to the backend directory
cd backend

# Create a Python virtual environment
python -m venv Qvenv

# Activate the environment (Windows)
.\Qvenv\Scripts\activate
# Activate the environment (Mac/Linux)
source Qvenv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:
```env
IBM_TOKEN="your_ibm_quantum_token"
DWAVE_TOKEN="your_dwave_leap_token"

# To test database integration locally, uncomment the line below:
# DATABASE_URL="postgresql://postgres:[PASSWORD]@db.supabase.com:5432/postgres"
```

Start the Flask server:
```bash
python qaoa_backend.py
```

### 2. Frontend Setup
```bash
# Navigate to the frontend directory
cd frontend

# Install Node modules
npm install
```

Create a `.env.development` file in the `frontend/` directory:
```env
VITE_BACKEND_URL="http://127.0.0.1:7860"
```

Start the Vite React app:
```bash
npm run dev
```

---

## ☁️ Cloud Deployment Architecture

QuantumMaps is designed to be deployed across three distinct platforms for maximum efficiency and cost-effectiveness (the $0/month architecture):

1. **Frontend (Vercel):** The React app is deployed to Vercel via an automated GitHub integration. Vercel acts as a global Edge CDN, ensuring lightning-fast load times.
2. **Backend (Hugging Face Spaces):** Standard free-tier PaaS providers (like Render or Heroku) limit RAM to 512MB, which instantly crashes when Qiskit attempts to simulate a 16-qubit statevector. We use **Hugging Face Spaces (Docker Tier)**, which provides a massive **16GB of RAM** for free, allowing deep quantum simulations. Deployments are handled via a custom GitHub Action (`.github/workflows/hf-sync.yml`).
3. **Database (Supabase):** Hugging Face Spaces have an ephemeral filesystem (data is wiped on restart). We use a free **Supabase PostgreSQL** instance to permanently store API quotas.

---

## 🔒 Security & Quota Management

Because IBM Quantum and D-Wave Leap have incredibly strict free-tier quotas (e.g., 10 minutes of QPU time a month), the backend is protected by a thread-safe SQL Quota Manager (`quota_manager.py`). 

Every API call is verified against the `ip_usage` and `global_usage` tables in the Supabase PostgreSQL database. 
- **IP Limit:** Max 2 quantum jobs per IP address per day.
- **Global Limit:** Max 50 quantum jobs across all users per month.

**Classical Fallback:** If a user exceeds their quota, or the platform hits the monthly limit, the backend instantly rejects the quantum execution and falls back to a blazing-fast Classical Simulated Annealing algorithm, ensuring the frontend app never breaks.

---

## 🔮 Future Roadmap
- [ ] Implement VQE (Variational Quantum Eigensolver) as an alternative to QAOA.
- [ ] Add real-time traffic data integration into the QUBO cost matrix.
- [ ] Introduce multi-vehicle routing (Q-CVRP) for fleet logistics.
- [ ] Expand frontend to allow CSV uploads for 50+ node classical optimizations.

---
*Built to demonstrate the supremacy of Quantum Mechanics in modern logistical topography.*
