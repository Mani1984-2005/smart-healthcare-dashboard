import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBcuVzniMt78ejpQWm3YuAZ8B3sMHz7Hx8",
  authDomain: "medicareplus-f6e11.firebaseapp.com",
  projectId: "medicareplus-f6e11",
  storageBucket: "medicareplus-f6e11.firebasestorage.app",
  messagingSenderId: "692224035352",
  appId: "1:692224035352:web:f942a08055afb09793916d",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;