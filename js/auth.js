
/**
 * Student Portal
 * Authentication Controller
 *
 * 保存先: js/auth.js
 */

import {
  auth,
  db,
  doc,
  getDoc,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  googleProvider,
  signOut,
  getFirebaseErrorMessage
} from "./firebase.js";

/* =====================================================
   1. 共通設定
   ===================================================== */

const LOGIN_PAGE = "./login.html";

let authObserverStarted = false;
let redirectResultChecked = false;

/* =====================================================
   2. ユーザー情報の取得
   ===================================================== */

export async function getUserData(user = auth.currentUser) {
  if (!user) {
    return null;
  }

  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || "",
      role: "student"
    };
  }

  const data = snapshot.data();

  return {
    ...data,
    uid: user.uid,
    email: user.email || data.email || "",
    displayName:
      data.displayName ||
      user.displayName ||
      user.email ||
      "",
    role: data.role === "admin" ? "admin" : "student"
  };
}

export async function getUserRole(user = auth.currentUser) {
  const userData = await getUserData(user);
  return userData?.role || null;
}

/* =====================================================
   3. ログイン後の画面遷移
   ===================================================== */

export async function redirectUser(user = auth.currentUser) {
  if (!user) {
    window.location.replace(LOGIN_PAGE);
    return;
  }

  try {
    const userData = await getUserData(user);

    const target = userData?.role === "admin"
      ? "./dashboard/admin.html"
      : "./dashboard/student.html";

    window.location.replace(target);
  } catch (error) {
    console.error("ユーザー情報の取得に失敗しました:", error);

    showLoginError(
      "アカウント情報を確認できません。時間をおいて再度お試しください。"
    );
  }
}

/* =====================================================
   4. ログイン画面のメッセージ
   ===================================================== */

function showLoginError(message) {
  const errorElement = document.getElementById("loginError");
  const successElement = document.getElementById("loginSuccess");
  const statusElement = document.getElementById("loginStatus");

  if (errorElement) {
    errorElement.textContent = message;
    errorElement.hidden = false;
  }

  if (successElement) {
    successElement.hidden = true;
  }

  if (statusElement) {
    statusElement.textContent = "";
  }
}

function clearLoginMessages() {
  const errorElement = document.getElementById("loginError");
  const successElement = document.getElementById("loginSuccess");
  const statusElement = document.getElementById("loginStatus");

  if (errorElement) {
    errorElement.hidden = true;
    errorElement.textContent = "";
  }

  if (successElement) {
    successElement.hidden = true;
    successElement.textContent = "";
  }

  if (statusElement) {
    statusElement.textContent = "";
  }
}

function showLoginStatus(message) {
  const statusElement = document.getElementById("loginStatus");

  if (statusElement) {
    statusElement.textContent = message;
  }
}

/* =====================================================
   5. ボタンの状態
   ===================================================== */

function setLoginLoading(isLoading, label = "ログイン") {
  const loginButton = document.getElementById("loginButton");
  const loginButtonText = document.getElementById("loginButtonText");
  const googleButton = document.getElementById("googleLoginButton");

  if (loginButton) {
    loginButton.disabled = isLoading;
  }

  if (loginButtonText) {
    loginButtonText.textContent = isLoading
      ? label
      : "ログイン";
  }

  if (googleButton) {
    googleButton.disabled = isLoading;
  }
}

/* =====================================================
   6. メールアドレスとパスワードでログイン
   ===================================================== */

export async function loginWithEmail(email, password) {
  const normalizedEmail = String(email || "").trim();

  if (!normalizedEmail || !password) {
    showLoginError("メールアドレスとパスワードを入力してください。");
    return null;
  }

  clearLoginMessages();
  setLoginLoading(true, "ログイン中…");

  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      normalizedEmail,
      password
    );

    await redirectUser(credential.user);

    return credential.user;
  } catch (error) {
    console.error("メールログインエラー:", error);
    showLoginError(getFirebaseErrorMessage(error));
    setLoginLoading(false);
    return null;
  }
}

/* =====================================================
   7. Google ログイン
   ===================================================== */

export async function loginWithGoogle() {
  clearLoginMessages();
  setLoginLoading(true, "Googleでログイン中…");

  try {
    const credential = await signInWithPopup(
      auth,
      googleProvider
    );

    await redirectUser(credential.user);

    return credential.user;
  } catch (error) {
    console.error("Googleログインエラー:", error);

    if (
      error.code === "auth/popup-blocked" ||
      error.code === "auth/operation-not-supported-in-this-environment"
    ) {
      try {
        await signInWithRedirect(auth, googleProvider);
        return null;
      } catch (redirectError) {
        console.error(
          "Googleリダイレクトログインエラー:",
          redirectError
        );

        showLoginError(
          getFirebaseErrorMessage(redirectError)
        );

        setLoginLoading(false);
        return null;
      }
    }

    showLoginError(getFirebaseErrorMessage(error));
    setLoginLoading(false);
    return null;
  }
}

/* =====================================================
   8. ログアウト
   ===================================================== */

export async function logout() {
  try {
    await signOut(auth);
    window.location.replace(LOGIN_PAGE);
  } catch (error) {
    console.error("ログアウトエラー:", error);
    alert("ログアウトに失敗しました。もう一度お試しください。");
  }
}

/* =====================================================
   9. ログイン画面のイベント登録
   ===================================================== */

function setupLoginForm() {
  const form = document.getElementById("loginForm");
  const googleButton = document.getElementById("googleLoginButton");

  if (form && form.dataset.authInitialized !== "true") {
    form.dataset.authInitialized = "true";

    form.addEventListener("submit", async event => {
      event.preventDefault();

      const emailInput = document.getElementById("email");
      const passwordInput = document.getElementById("password");

      await loginWithEmail(
        emailInput?.value,
        passwordInput?.value
      );
    });
  }

  if (
    googleButton &&
    googleButton.dataset.authInitialized !== "true"
  ) {
    googleButton.dataset.authInitialized = "true";

    googleButton.addEventListener("click", async () => {
      await loginWithGoogle();
    });
  }
}

/* =====================================================
   10. リダイレクトログイン結果
   ===================================================== */

async function processRedirectResult() {
  if (redirectResultChecked) {
    return;
  }

  redirectResultChecked = true;

  try {
    const result = await getRedirectResult(auth);

    if (result?.user) {
      await redirectUser(result.user);
    }
  } catch (error) {
    console.error("ログインリダイレクト結果エラー:", error);
    showLoginError(getFirebaseErrorMessage(error));
    setLoginLoading(false);
  }
}

/* =====================================================
   11. ページ初期化
   ===================================================== */

function initializeAuth() {
  const isLoginPage =
    window.location.pathname.endsWith("/login.html") ||
    window.location.pathname === "/login.html";

  if (isLoginPage) {
    setupLoginForm();
    processRedirectResult();
  }

  if (authObserverStarted) {
    return;
  }

  authObserverStarted = true;

  onAuthStateChanged(auth, user => {
    if (!isLoginPage || !user) {
      return;
    }

    // ログイン済みユーザーがログイン画面を開いた場合、
    // ロールに応じたダッシュボードへ移動する。
    redirectUser(user);
  });
}

/* =====================================================
   12. 既存コードとの互換性
   ===================================================== */

window.login = loginWithEmail;
window.googleLogin = loginWithGoogle;
window.logout = logout;

/* =====================================================
   13. ページ保護関数
   ===================================================== */

export async function requireLogin() {
  const user = auth.currentUser;

  if (user) {
    return user;
  }

  window.location.replace(LOGIN_PAGE);
  return null;
}

export async function requireAdmin() {
  const user = await requireLogin();

  if (!user) {
    return null;
  }

  try {
    const userData = await getUserData(user);

    if (userData?.role !== "admin") {
      window.location.replace("./student.html");
      return null;
    }

    return user;
  } catch (error) {
    console.error("管理者権限の確認に失敗しました:", error);
    window.location.replace(LOGIN_PAGE);
    return null;
  }
}

export async function requireStudent() {
  const user = await requireLogin();

  if (!user) {
    return null;
  }

  try {
    const userData = await getUserData(user);

    if (userData?.role === "admin") {
      window.location.replace("./admin.html");
      return null;
    }

    return user;
  } catch (error) {
    console.error("生徒権限の確認に失敗しました:", error);
    window.location.replace(LOGIN_PAGE);
    return null;
  }
}

initializeAuth();
