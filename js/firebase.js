
/**
 * Student Portal
 * Firebase 共通設定・認証・Firestore
 *
 * 保存先: js/firebase.js
 * Firebase SDK: 10.12.5
 */

import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
  runTransaction,
  increment,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/* =====================================================
   1. Firebase 設定
   ===================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyDmXjXpibfIfejGsUCMyHK9UzklG4WhEmw",
  authDomain: "aitera-83486.firebaseapp.com",
  projectId: "aitera-83486",
  storageBucket: "aitera-83486.firebasestorage.app",
  messagingSenderId: "79405334766",
  appId: "1:79405334766:web:694c02a7abb407b50c73ff"
};

/* =====================================================
   2. Firebase 初期化
   ===================================================== */

// すでに初期化されていれば既存のアプリを再利用する。
export const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

// Authentication
export const auth = getAuth(app);

// Firestore
export const db = getFirestore(app);

/* =====================================================
   3. Google 認証
   ===================================================== */

export const googleProvider = new GoogleAuthProvider();

// Google アカウント選択画面を表示する。
googleProvider.setCustomParameters({
  prompt: "select_account"
});

/* =====================================================
   4. Authentication のエクスポート
   ===================================================== */

export {
  onAuthStateChanged,

  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,

  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,

  signOut,
  GoogleAuthProvider,
  sendPasswordResetEmail,

  updateProfile,
  updateEmail,
  updatePassword,

  reauthenticateWithCredential,
  EmailAuthProvider,

  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
};

/* =====================================================
   5. Firestore のエクスポート
   ===================================================== */

export {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,

  collection,
  addDoc,
  getDocs,

  query,
  where,
  orderBy,
  limit,
  startAfter,

  onSnapshot,
  serverTimestamp,
  Timestamp,

  writeBatch,
  runTransaction,

  increment,
  arrayUnion,
  arrayRemove
};

/* =====================================================
   6. 共通ヘルパー
   ===================================================== */

/**
 * ログインユーザーのプロフィールを取得する。
 *
 * @param {string} uid Firebase Authentication の UID
 * @returns {Promise<object|null>}
 */
export async function getUserProfile(uid) {
  if (!uid) {
    throw new Error("ユーザーIDが指定されていません。");
  }

  const userRef = doc(db, "users", uid);
  const userSnapshot = await getDoc(userRef);

  if (!userSnapshot.exists()) {
    return null;
  }

  return {
    uid,
    ...userSnapshot.data()
  };
}

/**
 * ログインユーザーのプロフィールを保存する。
 *
 * merge: true により、既存の他のフィールドを維持する。
 *
 * @param {string} uid Firebase Authentication の UID
 * @param {object} profile 保存するプロフィール情報
 */
export async function saveUserProfile(uid, profile) {
  if (!uid) {
    throw new Error("ユーザーIDが指定されていません。");
  }

  if (
    !profile ||
    typeof profile !== "object" ||
    Array.isArray(profile)
  ) {
    throw new Error("プロフィールの形式が正しくありません。");
  }

  const userRef = doc(db, "users", uid);

  await setDoc(
    userRef,
    {
      ...profile,
      updatedAt: serverTimestamp()
    },
    {
      merge: true
    }
  );
}

/**
 * ログイン状態を確認する Promise。
 *
 * @returns {Promise<import("firebase/auth").User|null>}
 */
export function waitForAuthUser() {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
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

/**
 * Firebase エラーコードを画面表示向けの日本語に変換する。
 *
 * @param {Error & {code?: string}} error
 * @returns {string}
 */
export function getFirebaseErrorMessage(error) {
  const messages = {
    "auth/invalid-email":
      "メールアドレスの形式を確認してください。",

    "auth/user-not-found":
      "アカウントが見つかりません。",

    "auth/wrong-password":
      "メールアドレスまたはパスワードが正しくありません。",

    "auth/invalid-credential":
      "メールアドレスまたはパスワードが正しくありません。",

    "auth/email-already-in-use":
      "このメールアドレスはすでに登録されています。",

    "auth/weak-password":
      "パスワードをより強固なものにしてください。",

    "auth/too-many-requests":
      "試行回数が多すぎます。しばらく待ってから再試行してください。",

    "auth/network-request-failed":
      "通信に失敗しました。ネットワークを確認してください。",

    "auth/popup-closed-by-user":
      "Googleログインがキャンセルされました。",

    "auth/popup-blocked":
      "ポップアップがブロックされました。ブラウザの設定を確認してください。",

    "permission-denied":
      "この操作を行う権限がありません。",

    "unavailable":
      "サービスに接続できません。しばらくしてから再試行してください。"
  };

  return messages[error?.code] ||
    "処理に失敗しました。入力内容と設定を確認してください。";
}

console.info("Student Portal: Firebase 初期化完了");
