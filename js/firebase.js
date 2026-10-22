
/**
 * Firebase 共通設定
 * プロジェクト: aitera-83486
 * SDK バージョン: 10.12.5
 */

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
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
  serverTimestamp,
  Timestamp,
  writeBatch,
  onSnapshot,
  deleteField,
  increment,
  arrayUnion,
  arrayRemove
} from
  "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Firebase プロジェクト設定
const firebaseConfig = {
  apiKey: "AIzaSyDmXjXpibfIfejGsUCMyHK9UzklG4WhEmw",
  authDomain: "aitera-83486.firebaseapp.com",
  projectId: "aitera-83486",
  storageBucket: "aitera-83486.firebasestorage.app",
  messagingSenderId: "79405334766",
  appId: "1:79405334766:web:694c02a7abb407b50c73ff"
};

// 二重初期化を防止
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Google ログイン設定
const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account"
});

// アプリ本体・認証
export {
  app,
  auth,
  db,
  googleProvider,

  // Firebase Authentication
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged,
  signOut,

  // Firestore
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
  serverTimestamp,
  Timestamp,
  writeBatch,
  onSnapshot,
  deleteField,
  increment,
  arrayUnion,
  arrayRemove
};
