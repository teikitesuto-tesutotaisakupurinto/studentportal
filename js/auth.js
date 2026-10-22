
import {
  auth,
  googleProvider,
  db,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc
} from "./firebase.js";

const baseUrl = new URL("../", import.meta.url);

function goTo(path) {
  window.location.replace(new URL(path, baseUrl).href);
}

function showError(message) {
  const element = document.getElementById("loginError");

  if (element) {
    element.textContent = message;
    element.style.display = "block";
  } else {
    console.error(message);
    alert(message);
  }
}

function clearError() {
  const element = document.getElementById("loginError");
  if (element) {
    element.textContent = "";
    element.style.display = "none";
  }
}

function explainError(error) {
  console.error("Authentication error:", error);

  const messages = {
    "auth/invalid-email": "メールアドレスの形式が正しくありません。",
    "auth/invalid-credential": "メールアドレスまたはパスワードが正しくありません。",
    "auth/user-not-found": "ユーザーが見つかりません。",
    "auth/wrong-password": "パスワードが正しくありません。",
    "auth/user-disabled": "このアカウントは無効になっています。",
    "auth/too-many-requests": "試行回数が多すぎます。しばらくしてから再度お試しください。",
    "auth/network-request-failed": "通信に失敗しました。ネットワークを確認してください。",
    "auth/operation-not-allowed": "Firebase Consoleでこのログイン方法を有効にしてください。",
    "auth/unauthorized-domain": "Firebase Authenticationの承認済みドメインを確認してください。",
    "auth/popup-closed-by-user": "Googleログインがキャンセルされました。",
    "auth/popup-blocked": "ポップアップがブロックされました。",
    "permission-denied": "Firestoreのアクセス権限がありません。セキュリティルールを確認してください。",
    "unavailable": "Firestoreに接続できません。しばらくしてから再度お試しください。"
  };

  return messages[error?.code] ||
    `処理に失敗しました。エラーコード: ${error?.code || "不明"}`;
}

async function getUserData(user) {
  const userRef = doc(db, "users", user.uid);
  const userSnapshot = await getDoc(userRef);

  if (!userSnapshot.exists()) {
    return null;
  }

  return userSnapshot.data();
}

async function redirectUser(user) {
  clearError();

  try {
    const userData = await getUserData(user);

    if (!userData) {
      await signOut(auth);
      showError(
        "ログインしたアカウントの登録情報がありません。管理者にユーザー登録を依頼してください。"
      );
      return;
    }

    if (userData.role === "admin") {
      goTo("dashboard/admin.html");
      return;
    }

    if (userData.role === "student") {
      goTo("dashboard/student.html");
      return;
    }

    showError(
      "ユーザー権限が正しく設定されていません。Firestoreの users コレクションにある role を確認してください。"
    );
  } catch (error) {
    showError(explainError(error));
  }
}

function setBusy(button, busy) {
  if (!button) return;

  button.disabled = busy;

  if (busy) {
    button.setAttribute("aria-busy", "true");
  } else {
    button.removeAttribute("aria-busy");
  }
}

async function handleEmailLogin(event) {
  event.preventDefault();
  clearError();

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const button = event.submitter ||
    document.querySelector('#loginForm button[type="submit"]');

  const email = emailInput?.value.trim();
  const password = passwordInput?.value;

  if (!email || !password) {
    showError("メールアドレスとパスワードを入力してください。");
    return;
  }

  setBusy(button, true);

  try {
    const result = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    await redirectUser(result.user);
  } catch (error) {
    showError(explainError(error));
  } finally {
    setBusy(button, false);
  }
}

async function handleGoogleLogin() {
  clearError();

  const button = document.getElementById("googleLoginButton");
  setBusy(button, true);

  try {
    const result = await signInWithPopup(auth, googleProvider);
    await redirectUser(result.user);
  } catch (error) {
    showError(explainError(error));
  } finally {
    setBusy(button, false);
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
    goTo("index.html");
  } catch (error) {
    showError(explainError(error));
  }
}

const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", handleEmailLogin);
}

const googleButton = document.getElementById("googleLoginButton");

if (googleButton) {
  googleButton.addEventListener("click", handleGoogleLogin);
}

window.logout = handleLogout;

onAuthStateChanged(auth, user => {
  if (user) {
    console.info("認証済み:", user.uid);
  }
});
