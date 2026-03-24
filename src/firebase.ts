import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY             || 'AIzaSyCKWt-YqKG_8GYNFOk4hRx_w4ZfI5l_4QM',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN         || 'gen-lang-client-0573573934.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID          || 'gen-lang-client-0573573934',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID              || '1:580185633750:web:88549cd5a4edc1f1576a77',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET      || 'gen-lang-client-0573573934.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '580185633750',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, import.meta.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-ada3af3d-a65a-4e94-a996-d4d19fd3f8d5');
