import React, { useState, useMemo } from 'react';

interface Job {
  jobId: string;
  title: string;
  company: string;
  matchScore: number;
  status: string;          // "pending" | "applied" | "skipped"
  reason?: string;         // "demo-success" | "below-threshold" | etc. (optional)
}

interface RunStatus {
  status: string;          // "processing" | "matching complete" | "completed"
  jobs: Job[];
  threshold?: number;
}

function App() {
  const [runId, setRunId] = useState<string | null>(null);
  const [status, setStatus] = useState<RunStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [threshold, setThreshold] = useState<number>(0.70);  // default demo threshold
  const [error, setError] = useState<string | null>(null);

  const startAutoApply = async () => {
    setIsLoading(true);
    setStatus(null);
    setError(null);

    try {
      const res = await fetch('/auto-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // pass threshold so backend can use per-run override
        body: JSON.stringify({ threshold })
      });

      if (!res.ok) throw new Error(`Failed to start: ${res.status}`);
      const data = await res.json();
      setRunId(data.runId);
      pollStatus(data.runId);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Something went wrong starting the run.');
      setIsLoading(false);
    }
  };

  const pollStatus = (id: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/status/${id}`);
        if (!res.ok) throw new Error(`Status error: ${res.status}`);
        const data = (await res.json()) as RunStatus;
        setStatus(data);

        if (data.status === 'completed') {
          clearInterval(interval);
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error(err);
        setError(err?.message || 'Error while polling status.');
        clearInterval(interval);
        setIsLoading(false);
      }
    }, 1200);
  };

  const summary = useMemo(() => {
    if (!status?.jobs) return null;
    const applied = status.jobs.filter(j => j.status === 'applied').length;
    const skipped = status.jobs.filter(j => j.status === 'skipped').length;
    const pending = status.jobs.filter(j => j.status === 'pending').length;
    return { applied, skipped, pending, total: status.jobs.length };
  }, [status]);

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif', maxWidth: 720 }}>
      <h1>AI Auto-Apply Prototype</h1>

      {/* Threshold control (optional, for demo clarity) */}
      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ marginRight: 8 }}>
          Min score to auto-apply:
        </label>
        <select
          value={threshold}
          onChange={e => setThreshold(parseFloat(e.target.value))}
          disabled={isLoading}
          style={{ padding: '0.25rem 0.5rem' }}
        >
          <option value={0.70}>0.70</option>
          <option value={0.75}>0.75</option>
          <option value={0.80}>0.80</option>
          <option value={0.85}>0.85</option>
        </select>
      </div>

      <button
        onClick={startAutoApply}
        disabled={isLoading}
        style={{ padding: '0.5rem 1rem', fontSize: '1rem', cursor: isLoading ? 'not-allowed' : 'pointer' }}
      >
        {isLoading ? 'Running…' : 'Auto Apply'}
      </button>

      {error && (
        <div style={{ marginTop: '0.75rem', color: '#c62828' }}>
          {error}
        </div>
      )}

      {runId && (
        <div style={{ marginTop: '0.75rem', color: '#666' }}>
          Run ID: <code>{runId}</code>
        </div>
      )}

      {status && (
        <div style={{ marginTop: '1rem' }}>
          <h2>Status: {status.status}</h2>
          {typeof status.threshold === 'number' && (
            <div style={{ marginBottom: '0.5rem', color: '#555' }}>
              Using threshold: {status.threshold.toFixed(2)}
            </div>
          )}

          {summary && status.status === 'completed' && (
            <div style={{ marginBottom: '0.75rem', color: '#333' }}>
              Summary: applied {summary.applied} · skipped {summary.skipped} · pending {summary.pending} · total {summary.total}
            </div>
          )}

          <ul>
            {status.jobs.map(job => (
              <li key={job.jobId}>
                {job.title} at {job.company} – score: {job.matchScore} – {job.status}
                {job.reason ? ` (${job.reason})` : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
