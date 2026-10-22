
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
  GoogleAuthProvider,
  signOut
} from "./firebase.js";

const ROOT_URL = new URL("../", import.meta.url);

function pageUrl(path) {
  return new URL(path, ROOT_URL).href;
}

function getDashboardUrl(role) {
  return pageUrl(
    role === "admin"
      ? "dashboard/admin.html"
      : "dashboard/student.html"
  );
}

function getLoginUrl() {
  return pageUrl("login.html");
}

function getFirebaseErrorMessage(error) {
  switch (error?.code) {
    case "auth/invalid-email":
      return "メールアドレスの形式を確認してください。";

    case "auth/user-disabled":
      return "このアカウントは無効になっています。管理者にお問い合わせください。";

    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "メールアドレスまたはパスワードが正しくありません。";

    case "auth/email-already-in-use":
      return "このメールアドレスはすでに登録されています。";

    case "auth/weak-password":
      return "パスワードの強度が不足しています。";

    case "auth/popup-closed-by-user":
      return "ログイン画面が閉じられました。もう一度お試しください。";

    case "auth/popup-blocked":
      return "ポップアップがブロックされました。ブラウザの設定を確認してください。";

    case "auth/network-request-failed":
      return "通信に失敗しました。インターネット接続を確認してください。";

    case "auth/too-many-requests":
      return "試行回数が多すぎます。しばらく待ってから再度お試しください。";

    default:
      return "ログインに失敗しました。Firebaseの設定と通信状態を確認してください。";
  }
}

/**
 * Firestoreからログインユーザーのプロフィールを取得する。
 *
 * users/{uid} が存在しない場合は生徒として扱う。
 * 管理者権限はFirestore上のroleフィールドで判定する。
 */
async function getUserData(user) {
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
    email: data.email || user.email || "",
    displayName:
      data.displayName ||
      data.name ||
      user.displayName ||
      "",
    role: data.role === "admin" ? "admin" : "student"
  };
}

/**
 * ユーザーのロールを取得する。
 */
async function getUserRole(user = auth.currentUser) {
  if (!user) {
    return null;
  }

  const profile = await getUserData(user);
  return profile?.role || "student";
}

/**
 * ログイン済みユーザーを適切なダッシュボードへ移動させる。
 */
async function redirectUser(user = auth.currentUser) {
  if (!user) {
    location.replace(getLoginUrl());
    return;
  }

  try {
    const role = await getUserRole(user);

    location.replace(getDashboardUrl(role));
  } catch (error) {
    console.error("ユーザー情報の取得に失敗:", error);

    showLoginError(
      "ユーザー情報を取得できませんでした。通信状態とFirestoreの設定を確認してください。"
    );
  }
}

/**
 * ログイン画面にエラーを表示する。
 */
function showLoginError(message) {
  const errorElement = document.getElementById("loginError");

  if (errorElement) {
    errorElement.textContent = message;
    errorElement.hidden = false;
  } else {
    window.alert(message);
  }

  const successElement = document.getElementById("loginSuccess");

  if (successElement) {
    successElement.textContent = "";
    successElement.hidden = true;
  }

  const statusElement = document.getElementById("loginStatus");

  if (statusElement) {
    statusElement.textContent = "";
  }
}

/**
 * ログイン画面のメッセージを消す。
 */
function clearLoginMessages() {
  const errorElement = document.getElementById("loginError");
  const successElement = document.getElementById("loginSuccess");
  const statusElement = document.getElementById("loginStatus");

  if (errorElement) {
    errorElement.textContent = "";
    errorElement.hidden = true;
  }

  if (successElement) {
    successElement.textContent = "";
    successElement.hidden = true;
  }

  if (statusElement) {
    statusElement.textContent = "";
  }
}

/**
 * ログインボタンの状態を変更する。
 */
function setLoginLoading(loading, message = "") {
  const loginButton = document.getElementById("loginButton");
  const googleButton = document.getElementById("googleLoginButton");
  const loginButtonText = document.getElementById("loginButtonText");
  const statusElement = document.getElementById("loginStatus");

  if (loginButton) {
    loginButton.disabled = loading;
  }

  if (googleButton) {
    googleButton.disabled = loading;
  }

  if (loginButtonText) {
    loginButtonText.textContent = loading
      ? "ログイン中..."
      : "ログイン";
  }

  if (statusElement) {
    statusElement.textContent = message;
  }
}

/**
 * メールアドレスとパスワードによるログイン。
 */
async function loginWithEmail(email, password) {
  clearLoginMessages();
  setLoginLoading(true, "ログインしています...");

  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    await redirectUser(credential.user);
  } catch (error) {
    console.error("メールログインエラー:", error);

    setLoginLoading(false);
    showLoginError(getFirebaseErrorMessage(error));
  }
}

/**
 * Googleアカウントによるログイン。
 */
async function loginWithGoogle() {
  clearLoginMessages();
  setLoginLoading(true, "Googleアカウントを確認しています...");

  const provider = new GoogleAuthProvider();

  provider.setCustomParameters({
    prompt: "select_account"
  });

  try {
    const credential = await signInWithPopup(auth, provider);

    await redirectUser(credential.user);
  } catch (error) {
    console.error("Googleログインエラー:", error);

    if (
      error?.code === "auth/popup-blocked" ||
      error?.code === "auth/operation-not-supported-in-this-environment"
    ) {
      try {
        await signInWithRedirect(auth, provider);
        return;
      } catch (redirectError) {
        console.error(
          "Googleリダイレクトログインエラー:",
          redirectError
        );

        setLoginLoading(false);
        showLoginError(
          getFirebaseErrorMessage(redirectError)
        );
        return;
      }
    }

    setLoginLoading(false);
    showLoginError(getFirebaseErrorMessage(error));
  }
}

/**
 * ログアウト。
 */
async function logout() {
  try {
    await signOut(auth);
    location.replace(getLoginUrl());
  } catch (error) {
    console.error("ログアウトエラー:", error);

    window.alert(
      "ログアウトに失敗しました。通信状態を確認してください。"
    );
  }
}

/**
 * HTML側から呼び出せるように公開する。
 */
window.login = async function () {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  if (!emailInput || !passwordInput) {
    showLoginError("ログインフォームが見つかりません。");
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showLoginError("メールアドレスとパスワードを入力してください。");
    return;
  }

  await loginWithEmail(email, password);
};

window.googleLogin = loginWithGoogle;
window.logout = logout;

/**
 * ログインフォームのイベントを登録する。
 */
function setupLoginForm() {
  const form = document.getElementById("loginForm");
  const googleButton = document.getElementById("googleLoginButton");

  if (form && !form.dataset.authInitialized) {
    form.dataset.authInitialized = "true";

    form.addEventListener("submit", async event => {
      event.preventDefault();

      const email = document.getElementById("email")?.value.trim();
      const password = document.getElementById("password")?.value;

      if (!email || !password) {
        showLoginError(
          "メールアドレスとパスワードを入力してください。"
        );
        return;
      }

      await loginWithEmail(email, password);
    });
  }

  if (googleButton && !googleButton.dataset.authInitialized) {
    googleButton.dataset.authInitialized = "true";

    googleButton.addEventListener("click", async () => {
      await loginWithGoogle();
    });
  }
}

/**
 * ページごとの認証保護。
 */
function requireRole(requiredRole, callback) {
  let unsubscribe = () => {};
  let completed = false;

  const finish = () => {
    if (completed) return;

    completed = true;
    unsubscribe();
  };

  unsubscribe = onAuthStateChanged(
    auth,
    async user => {
      if (completed) return;

      if (!user) {
        finish();
        location.replace(getLoginUrl());
        return;
      }

      try {
        const profile = await getUserData(user);

        if (completed) return;

        if (
          requiredRole &&
          profile.role !== requiredRole
        ) {
          finish();

          location.replace(
            getDashboardUrl(profile.role)
          );

          return;
        }

        finish();

        if (typeof callback === "function") {
          callback({
            user,
            profile
          });
        }
      } catch (error) {
        console.error("ページ認証エラー:", error);
        finish();

        document.body.innerHTML = `
          <main style="
            max-width:640px;
            margin:60px auto;
            padding:24px;
            font-family:sans-serif;
            line-height:1.8;
          ">
            <h1>認証エラー</h1>
            <p>
              ユーザー情報を取得できませんでした。
              通信状態とFirestoreのセキュリティルールを確認してください。
            </p>
            <button onclick="location.reload()">
              再読み込み
            </button>
          </main>
        `;
      }
    },
    error => {
      console.error("認証状態の確認エラー:", error);

      finish();

      document.body.innerHTML = `
        <main style="
          max-width:640px;
          margin:60px auto;
          padding:24px;
          font-family:sans-serif;
          line-height:1.8;
        ">
          <h1>認証を確認できません</h1>
          <p>通信状態とFirebaseの設定を確認してください。</p>
          <button onclick="location.reload()">
            再読み込み
          </button>
        </main>
      `;
    }
  );

  return () => finish();
}

function requireLogin(callback) {
  return requireRole(null, callback);
}

function requireAdmin(callback) {
  return requireRole("admin", callback);
}

function requireStudent(callback) {
  return requireRole("student", callback);
}

/**
 * ログイン状態の監視とリダイレクト処理。
 */
async function initializeAuth() {
  const isLoginPage =
    /\/login\.html$/i.test(location.pathname);

  if (isLoginPage) {
    setupLoginForm();

    try {
      const redirectResult = await getRedirectResult(auth);

      if (redirectResult?.user) {
        await redirectUser(redirectResult.user);
        return;
      }
    } catch (error) {
      console.error("ログインリダイレクト結果エラー:", error);

      showLoginError(getFirebaseErrorMessage(error));
      setLoginLoading(false);
    }

    onAuthStateChanged(auth, async user => {
      if (!user) return;

      try {
        await redirectUser(user);
      } catch (error) {
        console.error("ログイン後の遷移エラー:", error);
      }
    });
  }
}

initializeAuth();

export {
  getUserData,
  getUserRole,
  redirectUser,
  loginWithEmail,
  loginWithGoogle,
  logout,
  requireLogin,
  requireAdmin,
  requireStudent
};
