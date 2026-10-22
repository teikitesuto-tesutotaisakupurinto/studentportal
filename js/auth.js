
/**
 * 認証・ユーザー権限管理
 * Firebase 共通設定: ./firebase.js
 */

import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  doc,
  getDoc
} from "./firebase.js";

// アプリのルート URL
// js/auth.js から1階層上をアプリのルートとする
const APP_BASE_URL = new URL("../", import.meta.url);

function appUrl(path) {
  return new URL(path.replace(/^\/+/, ""), APP_BASE_URL).href;
}

// エラーメッセージの表示
function showError(message) {
  const area = document.getElementById("loginError");

  if (area) {
    area.textContent = message;
    area.style.display = "block";
    return;
  }

  alert(message);
}

// エラー表示を消す
function clearError() {
  const area = document.getElementById("loginError");

  if (area) {
    area.textContent = "";
    area.style.display = "none";
  }
}

// Firebase Authentication のエラーを日本語化
function getAuthErrorMessage(error) {
  const messages = {
    "auth/invalid-email":
      "メールアドレスの形式が正しくありません。",
    "auth/user-disabled":
      "このアカウントは無効化されています。",
    "auth/user-not-found":
      "アカウントが見つかりません。",
    "auth/wrong-password":
      "メールアドレスまたはパスワードが正しくありません。",
    "auth/invalid-credential":
      "メールアドレスまたはパスワードが正しくありません。",
    "auth/too-many-requests":
      "ログインの試行回数が多すぎます。時間をおいて再試行してください。",
    "auth/network-request-failed":
      "ネットワークエラーです。接続を確認してください。",
    "auth/popup-closed-by-user":
      "Google ログインがキャンセルされました。",
    "auth/popup-blocked":
      "ポップアップがブロックされました。ブラウザの設定を確認してください。",
    "auth/unauthorized-domain":
      "このサイトのドメインが Firebase Authentication で承認されていません。",
    "auth/operation-not-allowed":
      "このログイン方法は Firebase で有効になっていません。"
  };

  return messages[error?.code] ||
    "処理に失敗しました。設定やネットワークを確認してください。";
}

// Firestore からユーザー情報を取得
export async function getUserData(user) {
  if (!user?.uid) {
    return null;
  }

  try {
    const userRef = doc(db, "users", user.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: user.uid,
      uid: user.uid,
      ...snapshot.data()
    };
  } catch (error) {
    console.error("ユーザー情報の取得に失敗:", error);
    throw error;
  }
}

// ユーザーの役割を取得
export async function getUserRole(user) {
  const data = await getUserData(user);
  return data?.role || null;
}

// 権限を確認して適切な画面へ移動
async function redirectUser(user) {
  clearError();

  try {
    const data = await getUserData(user);

    if (!data) {
      await signOut(auth);
      showError(
        "ユーザー情報が登録されていません。管理者に登録を依頼してください。"
      );
      return;
    }

    if (data.role === "admin") {
      location.replace(appUrl("dashboard/admin.html"));
      return;
    }

    if (data.role === "student") {
      location.replace(appUrl("dashboard/student.html"));
      return;
    }

    await signOut(auth);

    showError(
      "アカウントの権限が正しく設定されていません。管理者に確認してください。"
    );
  } catch (error) {
    console.error("ログイン後の処理に失敗:", error);

    try {
      await signOut(auth);
    } catch (signOutError) {
      console.error("サインアウトに失敗:", signOutError);
    }

    showError(
      "ユーザー情報を確認できませんでした。Firestore の設定と通信状態を確認してください。"
    );
  }
}

// メールアドレス・パスワードでログイン
window.login = async function () {
  clearError();

  const emailElement = document.getElementById("email");
  const passwordElement = document.getElementById("password");
  const button = document.getElementById("loginButton");

  const email = emailElement?.value.trim();
  const password = passwordElement?.value;

  if (!email || !password) {
    showError("メールアドレスとパスワードを入力してください。");
    return;
  }

  try {
    if (button) {
      button.disabled = true;
      button.textContent = "ログイン中...";
    }

    const result = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    await redirectUser(result.user);
  } catch (error) {
    console.error("メールログインエラー:", error);
    showError(getAuthErrorMessage(error));
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "ログイン";
    }
  }
};

// Google アカウントでログイン
window.googleLogin = async function () {
  clearError();

  const button = document.getElementById("googleLoginButton");

  try {
    if (button) {
      button.disabled = true;
    }

    const result = await signInWithPopup(auth, googleProvider);
    await redirectUser(result.user);
  } catch (error) {
    console.error("Google ログインエラー:", error);
    showError(getAuthErrorMessage(error));
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
};

// ログアウト
window.logout = async function () {
  try {
    await signOut(auth);
    location.replace(appUrl("index.html"));
  } catch (error) {
    console.error("ログアウトエラー:", error);
    alert("ログアウトできませんでした。再度お試しください。");
  }
};

// ログイン画面のフォーム送信
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();
    window.login();
  });
}

// Google ログインボタン
const googleButton = document.getElementById("googleLoginButton");

if (googleButton) {
  googleButton.addEventListener("click", function (event) {
    event.preventDefault();
    window.googleLogin();
  });
}

// ログイン状態の監視
onAuthStateChanged(auth, function (user) {
  if (user) {
    console.log("ログイン中:", user.email);
  }
});

// ログイン必須ページ用
export function requireLogin(callback) {
  let finished = false;

  const unsubscribe = onAuthStateChanged(auth, async function (user) {
    if (finished) return;

    if (!user) {
      finished = true;
      unsubscribe();
      location.replace(appUrl("index.html"));
      return;
    }

    try {
      const data = await getUserData(user);

      if (!data || !["admin", "student"].includes(data.role)) {
        finished = true;
        unsubscribe();
        await signOut(auth);
        location.replace(appUrl("index.html"));
        return;
      }

      if (!finished) {
        finished = true;
        unsubscribe();

        if (typeof callback === "function") {
          callback(user, data);
        }
      }
    } catch (error) {
      console.error("ログイン確認エラー:", error);

      if (!finished) {
        finished = true;
        unsubscribe();
        alert("ユーザー情報を取得できません。通信状態と権限設定を確認してください。");
        location.replace(appUrl("index.html"));
      }
    }
  });
}

// 管理者専用ページ用
export function requireAdmin(callback) {
  return requireLogin(function (user, data) {
    if (data.role !== "admin") {
      location.replace(appUrl("dashboard/student.html"));
      return;
    }

    if (typeof callback === "function") {
      callback(user, data);
    }
  });
}

// 生徒専用ページ用
export function requireStudent(callback) {
  return requireLogin(function (user, data) {
    if (data.role !== "student") {
      location.replace(appUrl("dashboard/admin.html"));
      return;
    }

    if (typeof callback === "function") {
      callback(user, data);
    }
  });
}
