🚀 AI Auto-Apply Prototype

A lightweight demonstration of the AI Auto-Apply system architecture.
It shows how a frontend (React + TypeScript) interacts with a backend (Node.js + Express) to simulate intelligent job-matching and automated application flows.

🧩 Overview

This prototype illustrates the end-to-end flow between:

Frontend (React + TypeScript) – User interface with threshold control and real-time status updates.

Backend (Node.js + Express) – Orchestrates job matching, scoring, and simulated application.

AI Integration (Simulated) – Generates mock match scores to mimic AI-based job fit analysis.

The result validates the system design and architecture behavior without external dependencies or API keys.

⚙️ Setup & Execution
Prerequisites

Node.js 18+

npm 9+

Steps
# 1️⃣  Start backend
cd prototype/backend
npm install
npm start

# 2️⃣  Start frontend
cd ../frontend
npm install
npm run dev


The frontend runs on http://localhost:3000
, the backend on http://localhost:3001
 (proxied via Vite).

✅ Expected Demo Output

When run with the default threshold of 0.70, the app produces:

AI Auto-Apply Prototype
Min score to auto-apply: 0.70
Auto Apply
Run ID: <uuid>
Status: completed
Using threshold: 0.70
Summary: applied 3 · skipped 0 · pending 0 · total 3
Full Stack Engineer at Tech Innovators Inc. – score: 0.9 – applied (demo-success)
AI Engineer at FutureAI Corp. – score: 0.8 – applied (demo-success)
DevOps Specialist at CloudOps Solutions – score: 0.7 – applied (demo-success)


This shows a fully working flow — frontend trigger → backend orchestration → deterministic, clear results.

⚙️ Configuration Options
Variable	Default	Description
MIN_MATCH_THRESHOLD	0.70	Minimum AI score required to auto-apply for a job.
APPLY_ALWAYS_SUCCESS	true	Ensures all applications succeed (demo-friendly).

Override them if you want to test different behavior:

# Example: require 0.75 score to apply
MIN_MATCH_THRESHOLD=0.75 APPLY_ALWAYS_SUCCESS=true npm start

🧠 Responsible AI & Prototype Scope

AI matching is simulated for demonstration.
In production, this stage would call an LLM (OpenAI GPT-4 / Anthropic Claude) via LangChain to compute semantic match scores between candidate profiles and job descriptions.

Deterministic behavior: random failures are disabled for clarity.

No external APIs or sensitive data are used.

Focus: architecture, orchestration, and scalability — not model training.

📊 Architecture Summary
Layer	Role	Technologies
Frontend	User controls, real-time feedback	React + TypeScript
API Gateway	Orchestration, threshold routing	Node.js (Express)
Matching Engine	AI scoring (simulated)	Static scores / LangChain-ready design
Job Fetcher	Mock job data	JSON file
Application Executor	Simulated auto-apply	Deterministic success
Analytics & State	Summary / Status tracking	In-memory store
Observability	Transparent flow & config logs	Console / Future Prometheus hooks
The AI matching logic in this prototype is simulated for deterministic behavior; in production, this would integrate an LLM (e.g., OpenAI or Claude) via LangChain for semantic matching.
No AI system made decisions autonomously — all design and implementation choices were my own.
