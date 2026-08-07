const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { getAuth } = require('firebase-admin/auth');

if (!getApps().length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
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
const storage = getStorage();
const auth = getAuth();

export { db, storage, auth };
