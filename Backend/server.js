/*
 * AI Auto-Apply backend service (prototype) — happy-path only
 *
 * Endpoints:
 *  POST /auto-apply      – starts a new auto-apply run (optional body: { threshold: number })
 *  GET  /status/:id      – returns the status and results of a run
 *
 * Notes:
 *  - No random failures (demo-friendly).
 *  - Optional match threshold (env or request body).
 *  - Jobs, matching, and applying are simulated to keep scope tight.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// === CONFIG ===
// If you want everything to succeed, leave APPLY_ALWAYS_SUCCESS=true (default).
const APPLY_ALWAYS_SUCCESS = process.env.APPLY_ALWAYS_SUCCESS !== 'false'; // default true
// Minimal match score needed to auto-apply (0..1). Can be overridden per request.
const MIN_MATCH_THRESHOLD = Number(process.env.MIN_MATCH_THRESHOLD || '0.70');

// In-memory runs store (simple for prototype; real systems would persist this).
const runs = {};

// Load mock jobs (id, title, company, description) from local file.
function loadJobs() {
  const filePath = path.join(__dirname, 'jobs.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

// Simulate matching: pick a few jobs and give descending scores.
function matchJobs(jobs) {
  return jobs.slice(0, 3).map((job, index) => ({
    jobId: job.id,
    title: job.title,
    company: job.company,
    matchScore: parseFloat((0.9 - index * 0.1).toFixed(2)), // 0.9, 0.8, 0.7
    status: 'pending'
  }));
}

// Apply step (demo-friendly): if above threshold => applied, else skipped.
// No random failures; keep the prototype simple and predictable.
async function applyToJobs(matchedJobs, threshold) {
  return matchedJobs.map(job => {
    if (APPLY_ALWAYS_SUCCESS) {
      if (Number(job.matchScore) >= threshold) {
        return { ...job, status: 'applied', reason: 'demo-success' };
      }
      return { ...job, status: 'skipped', reason: 'below-threshold' };
    }
    // If you ever set APPLY_ALWAYS_SUCCESS=false, still avoid randomness:
    if (Number(job.matchScore) >= threshold) {
      return { ...job, status: 'applied', reason: 'success' };
    }
    return { ...job, status: 'skipped', reason: 'below-threshold' };
  });
}

// POST /auto-apply – create a new run and start the pipeline
app.post('/auto-apply', (req, res) => {
  const runId = uuidv4();
  // Allow per-request override: { threshold: 0.75 }
  const requestedThreshold = typeof req.body?.threshold === 'number' ? req.body.threshold : undefined;
  const threshold = Number.isFinite(requestedThreshold) ? requestedThreshold : MIN_MATCH_THRESHOLD;

  runs[runId] = { status: 'processing', jobs: [], threshold };
  res.json({ runId });

  // Simulate async pipeline
  setTimeout(() => {
    const jobs = loadJobs();
    const matched = matchJobs(jobs);
    runs[runId] = { status: 'matching complete', jobs: matched, threshold };

    setTimeout(async () => {
      const applied = await applyToJobs(matched, threshold);
      runs[runId] = { status: 'completed', jobs: applied, threshold };
    }, 1000);
  }, 800);
});

// GET /status/:id – return status and results
app.get('/status/:id', (req, res) => {
  const run = runs[req.params.id];
  if (!run) return res.status(404).json({ error: 'Run not found' });
  res.json(run);
});

app.listen(PORT, () => {
  console.log(`Auto-apply backend listening on port ${PORT}`);
});
