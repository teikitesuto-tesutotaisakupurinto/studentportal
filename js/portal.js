
/**
 * ポータル共通処理
 * ファイル: js/portal.js
 * Firebase SDK: 10.12.5
 */

import {
  auth,
  db,
  doc,
  getDoc,
  signOut,
  onAuthStateChanged
} from "./firebase.js";

const SITE_NAME =
  "定期テスト対策プリント運営事務局";

const MENU_KEY = "portal_sidebar_collapsed";
const MOBILE_BREAKPOINT = 768;

// js/portal.js からアプリのルートを取得
const APP_BASE_URL = new URL("../", import.meta.url);

function appUrl(path) {
  return new URL(
    path.replace(/^\/+/, ""),
    APP_BASE_URL
  ).href;
}

// メニュー設定
const menus = {
  student: [
    {
      title: "ホーム",
      icon: "home",
      url: "dashboard/student.html"
    },
    {
      title: "お知らせ",
      icon: "campaign",
      url: "information/student.html"
    },
    {
      title: "連絡",
      icon: "mail",
      url: "messages/student.html"
    },
    {
      title: "配布文書",
      icon: "description",
      url: "documents/student.html"
    },
    {
      title: "カレンダー",
      icon: "calendar_month",
      url: "calendar/student.html"
    },
    {
      title: "テスト成績",
      icon: "assignment",
      url: "scoreForms/student.html"
    },
    {
      title: "設定",
      icon: "settings",
      url: "student.html"
    }
  ],

  admin: [
    {
      title: "ダッシュボード",
      icon: "dashboard",
      url: "dashboard/admin.html"
    },
    {
      title: "お知らせ管理",
      icon: "campaign",
      url: "information/admin.html"
    },
    {
      title: "連絡管理",
      icon: "mail",
      url: "messages/admin.html"
    },
    {
      title: "配布文書管理",
      icon: "description",
      url: "documents/admin.html"
    },
    {
      title: "カレンダー管理",
      icon: "calendar_month",
      url: "calendar/admin.html"
    },
    {
      title: "成績フォーム作成",
      icon: "assignment_add",
      url: "scoreForms/admin.html"
    },
    {
      title: "成績分析",
      icon: "analytics",
      url: "scores/admin.html"
    },
    {
      title: "生徒管理",
      icon: "group",
      url: "users/admin.html"
    }
  ]
};

// ページの想定ロールを判定
function getPageRole() {
  const path = location.pathname.toLowerCase();

  const adminPaths = [
    "/dashboard/admin.html",
    "/information/admin.html",
    "/messages/admin.html",
    "/documents/admin.html",
    "/calendar/admin.html",
    "/scoreforms/admin.html",
    "/scores/",
    "/users/admin.html"
  ];

  if (adminPaths.some(item => path.includes(item))) {
    return "admin";
  }

  return "student";
}

// HTML エスケープ
function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]
  );
}

// アイコン生成
function createIcon(name) {
  return `
    <span
      class="material-symbols-rounded menu-icon"
      aria-hidden="true"
    >${escapeHtml(name)}</span>
  `;
}

// ログアウト
async function handleLogout(button) {
  if (button) {
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
  }

  try {
    await signOut(auth);
    location.replace(appUrl("index.html"));
  } catch (error) {
    console.error("ログアウトエラー:", error);

    alert(
      "ログアウトに失敗しました。通信状態を確認して再度お試しください。"
    );

    if (button) {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  }
}

// メニューの開閉処理
function setupMenu() {
  const toggle =
    document.getElementById("portalMenuToggle");

  const mobileToggle =
    document.getElementById("mobileMenuToggle");

  const overlay =
    document.getElementById("portalOverlay");

  const logoutButton =
    document.getElementById("portalLogout");

  // PC 用の折りたたみ状態を復元
  try {
    const saved = localStorage.getItem(MENU_KEY);

    if (saved === "true") {
      document.body.classList.add("sidebar-collapsed");
    }
  } catch (error) {
    console.warn("メニュー設定を読み込めません:", error);
  }

  toggle?.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-collapsed");

    try {
      localStorage.setItem(
        MENU_KEY,
        String(
          document.body.classList.contains("sidebar-collapsed")
        )
      );
    } catch (error) {
      console.warn("メニュー設定を保存できません:", error);
    }
  });

  // モバイル・Chromebook の狭い画面
  mobileToggle?.addEventListener("click", () => {
    document.body.classList.toggle("mobile-sidebar-open");
  });

  overlay?.addEventListener("click", () => {
    document.body.classList.remove("mobile-sidebar-open");
  });

  logoutButton?.addEventListener("click", () => {
    handleLogout(logoutButton);
  });

  // Escape キーでモバイルメニューを閉じる
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      document.body.classList.remove("mobile-sidebar-open");
    }
  });

  // PC 幅に戻った場合はモバイルメニューを閉じる
  window.addEventListener("resize", () => {
    if (window.innerWidth > MOBILE_BREAKPOINT) {
      document.body.classList.remove("mobile-sidebar-open");
    }
  });
}

// ポータルの共通レイアウトを生成
function renderPortalShell() {
  const role = getPageRole();

  document.body.classList.add(
    "portal-body",
    `portal-${role}`
  );

  // 既存のシェルがあれば重複生成しない
  const existing = document.querySelector(".portal-shell");

  if (existing) {
    return document.getElementById("portalContent");
  }

  const shell = document.createElement("div");
  shell.className = "portal-shell";

  const navigation = menus[role]
    .map(item => {
      const href = appUrl(item.url);
      const current =
        location.pathname === new URL(href).pathname;

      return `
        <a
          class="portal-nav-item${current ? " active" : ""}"
          href="${escapeHtml(href)}"
          title="${escapeHtml(item.title)}"
          ${current ? 'aria-current="page"' : ""}
        >
          ${createIcon(item.icon)}
          <span class="portal-nav-text">
            ${escapeHtml(item.title)}
          </span>
        </a>
      `;
    })
    .join("");

  shell.innerHTML = `
    <aside class="portal-sidebar" aria-label="メインメニュー">

      <div class="portal-sidebar-top">
        <div class="portal-logo-area">
          <div class="portal-logo" aria-hidden="true">
            <span class="material-symbols-rounded">
              school
            </span>
          </div>

          <div class="portal-site-name">
            ${escapeHtml(SITE_NAME)}
          </div>
        </div>

        <button
          type="button"
          class="portal-menu-toggle"
          id="portalMenuToggle"
          aria-label="サイドバーを折りたたむ"
          title="メニューを開閉"
        >
          <span class="material-symbols-rounded">menu</span>
        </button>
      </div>

      <nav class="portal-nav">
        ${navigation}
      </nav>

      <div class="portal-sidebar-bottom">
        <button
          type="button"
          class="portal-logout-button"
          id="portalLogout"
          title="ログアウト"
        >
          ${createIcon("logout")}
          <span class="portal-nav-text">ログアウト</span>
        </button>
      </div>

    </aside>

    <main class="portal-main">

      <header class="portal-mobile-header">
        <button
          type="button"
          id="mobileMenuToggle"
          class="portal-mobile-menu"
          aria-label="メニューを開く"
          aria-expanded="false"
        >
          <span class="material-symbols-rounded">menu</span>
        </button>

        <div class="portal-mobile-title">
          ${escapeHtml(SITE_NAME)}
        </div>
      </header>

      <div class="portal-page">
        <div id="portalContent"></div>
      </div>

    </main>

    <div
      id="portalOverlay"
      class="portal-overlay"
      aria-hidden="true"
    ></div>
  `;

  document.body.prepend(shell);

  setupMenu();

  // モバイルメニューの aria-expanded を同期
  const mobileToggle =
    document.getElementById("mobileMenuToggle");

  mobileToggle?.addEventListener("click", () => {
    mobileToggle.setAttribute(
      "aria-expanded",
      String(
        document.body.classList.contains("mobile-sidebar-open")
      )
    );
  });

  return document.getElementById("portalContent");
}

// Firestore からログインユーザーのプロフィールを取得
async function getCurrentUserProfile(user = auth.currentUser) {
  if (!user?.uid) {
    return null;
  }

  try {
    const userRef = doc(db, "users", user.uid);
    const snapshot = await getDoc(userRef);

    // 登録されていないユーザーを生徒扱いにしない
    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();

    // 許可するロールを限定
    if (!["admin", "student"].includes(data.role)) {
      console.error("不正または未設定のユーザーロール:", data.role);
      return null;
    }

    return {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || "",
      ...data
    };
  } catch (error) {
    console.error("ユーザー情報取得エラー:", error);
    throw error;
  }
}

// 認証・権限確認
function protectPage(requiredRole = null) {
  return new Promise(resolve => {
    let completed = false;
    let unsubscribe = () => {};

    const finish = result => {
      if (completed) return;

      completed = true;
      unsubscribe();
      resolve(result);
    };

    unsubscribe = onAuthStateChanged(
      auth,
      async user => {
        if (completed) return;

        if (!user) {
          finish(null);
          location.replace(appUrl("index.html"));
          return;
        }

        try {
          const profile = await getCurrentUserProfile(user);

          if (completed) return;

          if (!profile) {
            await signOut(auth);
            finish(null);
            location.replace(appUrl("index.html"));
            return;
          }

          if (
            requiredRole &&
            profile.role !== requiredRole
          ) {
            const destination =
              profile.role === "admin"
                ? "dashboard/admin.html"
                : "dashboard/student.html";

            finish(null);

            alert("このページを利用する権限がありません。");
            location.replace(appUrl(destination));
            return;
          }

          finish({
            user,
            profile
          });
        } catch (error) {
          console.error("ページ認証エラー:", error);

          finish(null);

          alert(
            "ユーザー情報を確認できませんでした。通信状態と Firestore の設定を確認してください。"
          );

          location.replace(appUrl("index.html"));
        }
      },
      error => {
        console.error("認証状態の監視エラー:", error);

        finish(null);

        alert(
          "ログイン状態を確認できませんでした。ページを再読み込みしてください。"
        );

        location.replace(appUrl("index.html"));
      }
    );
  });
}

// 公開 API
window.portal = {
  SITE_NAME,
  menus,
  renderPortalShell,
  setupMenu,
  getCurrentUserProfile,
  protectPage
};

export {
  SITE_NAME,
  menus,
  renderPortalShell,
  setupMenu,
  getCurrentUserProfile,
  protectPage
};
