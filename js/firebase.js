
import { initializeApp, getApp, getApps } from
  "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  updateEmail,
  updatePassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  getDocFromCache,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  Timestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Firebaseプロジェクト設定
const firebaseConfig = {
  apiKey: "AIzaSyDmXjXpibfIfejGsUCMyHK9UzklG4WhEmw",
  authDomain: "aitera-83486.firebaseapp.com",
  projectId: "aitera-83486",
  storageBucket: "aitera-83486.firebasestorage.app",
  messagingSenderId: "79405334766",
  appId: "1:79405334766:web:694c02a7abb407b50c73ff"
};

// アプリを重複初期化しない
const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

// Authentication・Firestore
const auth = getAuth(app);
const db = getFirestore(app);

// Googleログイン
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account"
});

// プロフィール取得
async function getUserProfile(uid) {
  if (!uid) {
    throw new Error("ユーザーUIDが指定されていません。");
  }

  const snapshot = await getDoc(doc(db, "users", uid));

  if (!snapshot.exists()) {
    return null;
  }

  return {
    uid: snapshot.id,
    ...snapshot.data()
  };
}

// プロフィール保存
async function saveUserProfile(uid, profile) {
  if (!uid) {
    throw new Error("ユーザーUIDが指定されていません。");
  }

  if (!profile || typeof profile !== "object") {
    throw new Error("プロフィールの形式が正しくありません。");
  }

  // この関数自体は管理者権限を付与しない。
  const profileRef = doc(db, "users", uid);

  await setDoc(profileRef, {
    ...profile,
    uid
  }, {
    merge: true
  });
}

// Firebaseエラーを日本語化
function getFirebaseErrorMessage(error) {
  const messages = {
    "auth/invalid-email":
      "メールアドレスの形式を確認してください。",
    "auth/user-not-found":
      "ユーザーが見つかりません。",
    "auth/wrong-password":
      "メールアドレスまたはパスワードが違います。",
    "auth/invalid-credential":
      "ログイン情報が正しくありません。",
    "auth/email-already-in-use":
      "このメールアドレスはすでに登録されています。",
    "auth/weak-password":
      "パスワードをより強固なものにしてください。",
    "auth/network-request-failed":
      "ネットワーク接続を確認してください。",
    "auth/popup-blocked":
      "ログイン画面がブロックされました。ポップアップ設定を確認してください。",
    "auth/popup-closed-by-user":
      "ログイン画面が閉じられました。",
    "auth/too-many-requests":
      "試行回数が多すぎます。しばらくしてから再試行してください。",
    "permission-denied":
      "アクセス権限がありません。Firestore Security Rulesを確認してください。"
  };

  return messages[error?.code] ||
    error?.message ||
    "予期しないエラーが発生しました。";
}

// 認証状態の確定を待つ
function waitForAuthUser() {
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {};

    unsubscribe = onAuthStateChanged(
      auth,
      user => {
        unsubscribe();
        resolve(user);
      },
      error => {
        unsubscribe();
        reject(error);
      }
    );
  });
}

// 各ページから使用できるようにエクスポート
export {
  app,
  auth,
  db,
  googleProvider,

  // Authentication
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  updateEmail,
  updatePassword,
  signOut,
  onAuthStateChanged,

  // Firestore
  doc,
  getDoc,
  getDocFromCache,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  Timestamp,
  writeBatch,

  // 独自ヘルパー
  getUserProfile,
  saveUserProfile,
  getFirebaseErrorMessage,
  waitForAuthUser
};
