const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

if (!getApps().length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      initializeApp({
        credential: cert(serviceAccount)
      });
      console.log('✅ Firebase Admin Inicializado (CommonJS)');
    } else {
      initializeApp(); 
    }
  } catch (e) {
    console.error('❌ Error CRÍTICO inicializando Firebase Admin:', e.message);
  }
}

const db = getFirestore();

export { db };
