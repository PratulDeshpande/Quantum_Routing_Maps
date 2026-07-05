# QuantumMaps

QuantumMaps is a hybrid quantum-classical application that optimizes delivery routes using the Quantum Approximate Optimization Algorithm (QAOA). It can dispatch quantum optimization jobs to IBM Quantum hardware or D-Wave Annealers, and also includes classical heuristic fallbacks.

## Architecture
- **Backend:** Flask web service that orchestrates quantum jobs using Qiskit and D-Wave Ocean SDK.
- **Frontend:** React + Vite application leveraging Leaflet for mapping.

## How to Run Locally

### 1. Prerequisites
- Node.js (v18+)
- Python (3.9+)

### 2. Backend Setup
```bash
cd backend
python -m venv Qvenv
# Windows
Qvenv\Scripts\activate
# Unix
source Qvenv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file in the `backend` directory:
```
IBM_TOKEN=your_ibm_quantum_token
DWAVE_TOKEN=your_dwave_leap_token
```

Run the server:
```bash
python qaoa_backend.py
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Create a `.env.development` file in the `frontend` directory:
```
VITE_BACKEND_URL=http://127.0.0.1:7860
```

## Deployment
- The backend is configured to be deployed on Hugging Face Spaces using the provided Dockerfile.
- The frontend can be built via `npm run build` and deployed to GitHub Pages or any static host.
