/*
 * AI Auto-Apply backend service (prototype)
 * - Non-blocking even without OpenAI/Firebase
 * - Timeouts & defensive fallbacks
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const { db } = require('./firebase');
const { scoreMatch } = require('./ai');

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(express.json());
app.use(cors()); // ok for demo; restrict origins in prod

// --- CONFIG ---
const APPLY_ALWAYS_SUCCESS = process.env.APPLY_ALWAYS_SUCCESS !== 'false';
const MIN_MATCH_THRESHOLD = Number(process.env.MIN_MATCH_THRESHOLD || '0.70');
const USER_ID = process.env.DEMO_USER_ID || 'demo-user';

const runs = {}; // live status for polling

// --- Helpers ---
const loadJobs = () => {
  const p = path.join(__dirname, 'jobs.json');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
};

const DEMO_PROFILE = {
  name: 'Demo Candidate',
  skills: ['React', 'Node.js', 'TypeScript', 'JavaScript', 'Express', 'REST', 'Docker', 'CI/CD'],
  experienceYears: 4,
  preferences: { locations: ['Remote', 'Gurugram', 'Bengaluru'] }
};

const fallbackMatch = (jobs) =>
  jobs.slice(0, 3).map((job, i) => ({
    jobId: job.id,
    title: job.title,
    company: job.company,
    matchScore: Number((0.9 - i * 0.1).toFixed(2)), // 0.9, 0.8, 0.7
    status: 'pending',
    reason: 'fallback'
  }));

async function scoreJobs(profile, jobs) {
  try {
    const results = await Promise.all(
      jobs.map(async (job) => {
        const res = await scoreMatch({ profile, job }); // always returns quickly (fallback on error)
        const score01 = Number((Math.max(0, Math.min(100, Number(res?.score || 0))) / 100).toFixed(2));
        return {
          jobId: job.id,
          title: job.title,
          company: job.company,
          matchScore: score01,
          status: 'pending',
          reason: res?.reason || 'ai-score'
        };
      })
    );
    return results.sort((a, b) => b.matchScore - a.matchScore).slice(0, 3);
  } catch (e) {
    console.warn('[match] AI batch failed, using fallback:', e?.message || e);
    return fallbackMatch(jobs);
  }
}

function applyToJobs(matched, threshold) {
  return matched.map(j => {
    const ok = Number(j.matchScore) >= threshold;
    return {
      ...j,
      status: ok ? 'applied' : 'skipped',
      reason: ok ? (j.reason || 'applied') : 'below-threshold'
    };
  });
}

async function persistRun(runId, payload) {
  if (!db) return; // skip if Firestore not available
  try {
    await db.collection('applications').doc(runId).set(payload, { merge: true });
  } catch (e) {
    console.warn('[firestore] write error (non-fatal):', e?.message || e);
  }
}

// --- Routes ---
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    firebase: !!db,
    openai: !!process.env.OPENAI_API_KEY,
    port: PORT
  });
});

app.post('/auto-apply', async (req, res) => {
  const runId = uuidv4();
  const requested = typeof req.body?.threshold === 'number' ? req.body.threshold : undefined;
  const threshold = Number.isFinite(requested) ? requested : MIN_MATCH_THRESHOLD;

  runs[runId] = { status: 'processing', jobs: [], threshold };
  res.json({ runId });

  // async pipeline
  try {
    const jobs = loadJobs();

    // Step 1: scoring
    const matched = await scoreJobs(DEMO_PROFILE, jobs);
    runs[runId] = { status: 'matching complete', jobs: matched, threshold };
    persistRun(runId, {
      userId: USER_ID,
      status: 'matching complete',
      threshold,
      createdAt: Date.now(),
      jobs: matched
    }).catch(() => {});

    // Step 2: apply (tiny delay to show progress)
    setTimeout(async () => {
      const finalJobs = applyToJobs(matched, threshold);
      runs[runId] = { status: 'completed', jobs: finalJobs, threshold };
      persistRun(runId, {
        userId: USER_ID,
        status: 'completed',
        threshold,
        updatedAt: Date.now(),
        jobs: finalJobs
      }).catch(() => {});
    }, 500);
  } catch (e) {
    console.error('[pipeline] fatal:', e);
    runs[runId] = { status: 'failed', jobs: [], threshold, error: String(e?.message || e) };
    persistRun(runId, {
      userId: USER_ID,
      status: 'failed',
      threshold,
      updatedAt: Date.now(),
      jobs: []
    }).catch(() => {});
  }
});

app.get('/status/:id', (req, res) => {
  const run = runs[req.params.id];
  if (!run) return res.status(404).json({ error: 'Run not found' });
  res.json(run);
});

app.listen(PORT, () => {
  console.log(`[server] Auto-apply backend on :${PORT}`);
});
