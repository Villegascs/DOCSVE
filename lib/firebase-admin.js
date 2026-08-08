const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

if (!getApps().length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      initializeApp({
        credential: cert(serviceAccount),
        storageBucket: 'docsven.appspot.com'
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

export { db, storage };
