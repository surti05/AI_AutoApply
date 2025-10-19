// Backend/firebase.js
let db = null;

try {
  const admin = require('firebase-admin');

  // Prefer explicit service account to avoid ADC hangs:
  // Set FIREBASE_SA_PATH=/abs/path/to/serviceAccount.json
  const saPath = process.env.FIREBASE_SA_PATH;

  if (saPath) {
    const serviceAccount = require(saPath);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
    // Fallback: will only work if GOOGLE_APPLICATION_CREDENTIALS is set and valid
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  }

  db = admin.firestore();
  console.log('[firebase] Firestore initialized');
} catch (err) {
  console.warn('[firebase] Skipping Firestore (no creds or admin not installed):', err?.message || err);
}

module.exports = { db };

