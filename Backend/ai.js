// Backend/ai.js
const hasKey = !!process.env.OPENAI_API_KEY;
let OpenAI, client;
try {
  OpenAI = require('openai');
  client = hasKey ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
} catch (e) {
  client = null;
}

// ---------- Heuristic scoring (stronger & varied) ----------
function normTokens(txt) {
  return (txt || "")
    .toLowerCase()
    .replace(/[^a-z0-9+.#/ ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}
function uniq(arr) { return Array.from(new Set(arr)); }

function heuristicScore({ profile, job }) {
  const skills = (profile?.skills || []).map(s => s.toLowerCase());
  const titleT = normTokens(job.title);
  const descT  = normTokens(job.description);
  const allT   = new Set([...titleT, ...descT]);

  const skillsSet = new Set(skills);
  const titleMatches = skills.filter(s => titleT.includes(s));
  const descMatches  = skills.filter(s => descT.includes(s));
  const matched = uniq([...titleMatches, ...descMatches]);

  // Base score: title hits worth 3x, description hits 1x (stronger than before)
  let score = (3 * titleMatches.length) + (1 * descMatches.length);

  // Role keyword boosts (adds realistic differentiation)
  const roleBoosts = [
    { kw: ['full', 'stack'], add: 4 },      // "full stack"
    { kw: ['frontend'], add: 3 },
    { kw: ['devops'], add: 3 },
    { kw: ['ai'], add: 1 },                 // profile is weak on AI by default
    { kw: ['ml'], add: 1 },
  ];
  for (const b of roleBoosts) {
    if (b.kw.every(k => allT.has(k))) score += b.add;
  }

  // Specific tech boosts (common demo skills)
  const techBoosts = [
    ['react', 3], ['node', 3], ['node.js', 3],
    ['typescript', 2], ['javascript', 1],
    ['express', 2], ['rest', 2],
    ['docker', 2], ['ci', 1], ['cd', 1], ['ci/cd', 2],
    ['kubernetes', 2], ['aws', 2]
  ];
  for (const [kw, add] of techBoosts) {
    if (allT.has(kw)) score += add;
  }

  // Normalize: max possible rough scale for demo (~25); clamp to 0..1
  let score01 = Math.max(0, Math.min(1, score / 25));

  // Strong-fit floors:
  // - Full Stack: title mentions "full" & "stack" + has React or Node skill → at least 0.80
  const isFullStackTitle = allT.has('full') && allT.has('stack');
  const hasReactOrNode   = skillsSet.has('react') || skillsSet.has('node.js') || skillsSet.has('node');
  if (isFullStackTitle && hasReactOrNode) score01 = Math.max(score01, 0.82);

  // - Frontend: title contains "frontend" + react/typescript skill → at least 0.78
  const isFrontendTitle = allT.has('frontend');
  const hasFECore       = skillsSet.has('react') || skillsSet.has('typescript') || skillsSet.has('javascript');
  if (isFrontendTitle && hasFECore) score01 = Math.max(score01, 0.78);

  // - DevOps: title contains "devops" + docker/ci/cd → mid-high but not as high
  const isDevOpsTitle = allT.has('devops');
  const hasDevOpsBits = skillsSet.has('docker') || skillsSet.has('ci/cd') || skillsSet.has('ci') || skillsSet.has('cd');
  if (isDevOpsTitle && hasDevOpsBits) score01 = Math.max(score01, 0.66);

  // - AI Engineer: demo profile is weak in ML/NLP → keep modest unless job mentions "react" etc.
  const mentionsAI = allT.has('ai') || allT.has('ml') || allT.has('nlp');
  if (mentionsAI && !hasReactOrNode) score01 = Math.min(score01, 0.45);

  const reason = matched.length
    ? `heuristic: matched skills ${matched.join(', ')}`
    : 'heuristic: low skill overlap';

  return { score: Math.round(score01 * 100), reason };
}

// ---------- OpenAI wrapper with timeout
