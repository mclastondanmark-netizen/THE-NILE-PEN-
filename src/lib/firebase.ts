import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBMDKQ31CT1TMgSyEIN7AwERZgcBquWcAU",
  authDomain: "gen-lang-client-0912197196.firebaseapp.com",
  projectId: "gen-lang-client-0912197196",
  storageBucket: "gen-lang-client-0912197196.firebasestorage.app",
  messagingSenderId: "357897791450",
  appId: "1:357897791450:web:ba8ffcd483134eee3d02e3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom databaseId
export const db = getFirestore(app, "ai-studio-e1580e18-14e9-419d-a626-6dd309f8171a");

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
export { app };
