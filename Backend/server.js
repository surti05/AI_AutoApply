/*
 * AI Auto‑Apply backend service (prototype)
 *
 * This Express server exposes two endpoints:
 *  POST /auto‑apply  – starts a new auto‑apply run and returns a runId
 *  GET  /status/:id   – returns the status and results of a run
 *
 * Job discovery, matching and application are simulated using
 * static data and setTimeout() calls.  In production these would be
 * asynchronous tasks that fetch real jobs, call AI models for
 * matching, and use Playwright/Puppeteer to submit applications.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// In‑memory store for runs.  In a real implementation this would
// live in Firestore or another database so that status persists
// across server restarts【314292304843496†L52-L55】.
const runs = {};

// Load mock jobs from a JSON file.  Each job has id, title, company and description.
function loadJobs() {
  const filePath = path.join(__dirname, 'jobs.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

// Simulate matching engine – select a subset of jobs and assign match scores.
function matchJobs(jobs) {
  return jobs.slice(0, 3).map((job, index) => {
    return {
      jobId: job.id,
      title: job.title,
      company: job.company,
      matchScore: parseFloat((0.9 - index * 0.1).toFixed(2)),
      status: 'pending'
    };
  });
}

// Simulate application executor – pretend to apply to each job and mark status.
function applyToJobs(matchedJobs) {
  return matchedJobs.map(job => {
    // random success/failure simulation
    const success = Math.random() > 0.2;
    return {
      ...job,
      status: success ? 'applied' : 'failed'
    };
  });
}

// POST /auto‑apply – create a new run and begin processing
app.post('/auto-apply', (req, res) => {
  const runId = uuidv4();
  runs[runId] = { status: 'processing', jobs: [] };
  res.json({ runId });

  // Simulate asynchronous pipeline
  setTimeout(() => {
    const jobs = loadJobs();
    const matched = matchJobs(jobs);
    // update intermediate state
    runs[runId] = { status: 'matching complete', jobs: matched };
    // Simulate application time
    setTimeout(() => {
      const applied = applyToJobs(matched);
      runs[runId] = { status: 'completed', jobs: applied };
    }, 2000);
  }, 2000);
});

// GET /status/:id – return status and results
app.get('/status/:id', (req, res) => {
  const run = runs[req.params.id];
  if (!run) {
    return res.status(404).json({ error: 'Run not found' });
  }
  res.json(run);
});

app.listen(PORT, () => {
  console.log(`Auto‑apply backend listening on port ${PORT}`);
});