import { initializeApp } from
"https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from
"https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from
"https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/*
 * ==========================================
 * Firebase設定
 * ==========================================
 *
 * ↓↓↓ あなたの現在のFirebase設定をそのまま入れる ↓↓↓
 */

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "reservelink-efb43.firebaseapp.com",
  projectId: "reservelink-efb43",
  storageBucket: "reservelink-efb43.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account"
});

export {
  app,
  auth,
  db,
  googleProvider,

  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,

  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,

  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,

  query,
  where,
  orderBy,
  limit,
  serverTimestamp
};
