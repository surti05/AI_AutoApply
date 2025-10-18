import React, { useState } from 'react';

interface Job {
  jobId: string;
  title: string;
  company: string;
  matchScore: number;
  status: string;
}

interface RunStatus {
  status: string;
  jobs: Job[];
}

function App() {
  const [runId, setRunId] = useState<string | null>(null);
  const [status, setStatus] = useState<RunStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const startAutoApply = async () => {
    setIsLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/auto-apply', { method: 'POST' });
      const data = await res.json();
      setRunId(data.runId);
      pollStatus(data.runId);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  const pollStatus = (id: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/status/${id}`);
        const data = (await res.json()) as RunStatus;
        setStatus(data);
        if (data.status === 'completed') {
          clearInterval(interval);
          setIsLoading(false);
        }
      } catch (err) {
        console.error(err);
        clearInterval(interval);
        setIsLoading(false);
      }
    }, 2000);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>AI Auto‑Apply Prototype</h1>
      <button
        onClick={startAutoApply}
        disabled={isLoading}
        style={{ padding: '0.5rem 1rem', fontSize: '1rem', cursor: isLoading ? 'not-allowed' : 'pointer' }}
      >
        {isLoading ? 'Running…' : 'Auto Apply'}
      </button>
      {status && (
        <div style={{ marginTop: '1rem' }}>
          <h2>Status: {status.status}</h2>
          <ul>
            {status.jobs.map(job => (
              <li key={job.jobId}>
                {job.title} at {job.company} – score: {job.matchScore} – {job.status}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;