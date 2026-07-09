import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// Validate required environment variables
const requiredEnvVars = [
  'FIREBASE_ADMIN_PROJECT_ID',
  'FIREBASE_ADMIN_PRIVATE_KEY_ID', 
  'FIREBASE_ADMIN_PRIVATE_KEY',
  'FIREBASE_ADMIN_CLIENT_EMAIL'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.warn(`Missing Firebase Admin environment variables: ${missingVars.join(', ')}`);
}

const firebaseAdminConfig = {
  type: "service_account",
  project_id: process.env.FIREBASE_ADMIN_PROJECT_ID || "liwach-19664",
  private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID || "",
  private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n') || "",
  client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL || "",
  client_id: "100842412687790302939",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40liwach-19664.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

// Initialize Firebase Admin SDK
let app;
try {
  app = getApps().length === 0 
    ? initializeApp({
        credential: cert(firebaseAdminConfig as any),
        projectId: firebaseAdminConfig.project_id,
      })
    : getApps()[0];
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
  // Fallback initialization for development
  app = getApps().length === 0 
    ? initializeApp({
        projectId: "liwach-19664",
      })
    : getApps()[0];
}

// Export Firebase Admin services
export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
export const adminStorage = getStorage(app);

export default app;