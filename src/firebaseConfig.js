import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth'; // 👈 Auth import kiya
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBtyyAAh1soYu4xrfeyaJgfpi74554t1eg",
  authDomain: "quick-commerce-app-3e866.firebaseapp.com",
  projectId: "quick-commerce-app-3e866",
  storageBucket: "quick-commerce-app-3e866.firebasestorage.app",
  messagingSenderId: "525263145004",
  appId: "1:525263145004:web:374dd08f9612a4d19b6989",
  measurementId: "G-LKW3C41VTK"
};

// Prevent duplicate app initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Exports
export const db = getFirestore(app);
export const auth = getAuth(app); // 👈 Export Auth