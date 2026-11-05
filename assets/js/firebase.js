import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyBBG9dp2ZlFOGSNCuMopgnFGGoNnDqcflc",
  authDomain: "pap1-a6f8f.firebaseapp.com",
  projectId: "pap1-a6f8f",
  storageBucket: "pap1-a6f8f.firebasestorage.app",
  messagingSenderId: "687960743893",
  appId: "1:687960743893:web:3cb0849456ed142f67e75c",
  measurementId: "G-EXL7R3HVCM",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);