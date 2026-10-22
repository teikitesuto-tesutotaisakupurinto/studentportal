
import {
  auth,
  db,
  doc,
  getDoc,
  onAuthStateChanged,
  signOut
} from "./firebase.js";

const SITE_NAME =
  "定期テスト対策プリント運営事務局";

const STORAGE_KEY = "portal_sidebar_collapsed";
const ROOT_URL = new URL("../", import.meta.url);

const pageUrl = (path) => new URL(path, ROOT_URL).href;

const menus = {
  student: [
    {
      title: "ホーム",
      icon: "home",
      path: "dashboard/student.html"
    },
    {
      title: "お知らせ",
      icon: "campaign",
      path: "information/student.html"
    },
    {
      title: "連絡",
      icon: "mail",
      path: "messages/student.html"
    },
    {
      title: "配布文書",
      icon: "description",
      path: "documents/student.html"
    },
    {
      title: "カレンダー",
      icon: "calendar_month",
      path: "calendar/student.html"
    },
    {
      title: "テスト成績",
      icon: "assignment",
      path: "scoreForms/student.html"
    },
    {
      title: "設定",
      icon: "settings",
      path: "student.html"
    }
  ],

  admin: [
    {
      title: "ダッシュボード",
      icon: "dashboard",
      path: "dashboard/admin.html"
    },
    {
      title: "お知らせ管理",
      icon: "campaign",
      path: "information/admin.html"
    },
    {
      title: "連絡管理",
      icon: "mail",
      path: "messages/admin.html"
    },
    {
      title: "配布文書管理",
      icon: "description",
      path: "documents/admin.html"
    },
    {
      title: "カレンダー管理",
      icon: "calendar_month",
      path: "calendar/admin.html"
    },
    {
      title: "成績フォーム作成",
      icon: "assignment_add",
      path: "scoreForms/admin.html"
    },
    {
      title: "成績分析",
      icon: "analytics",
      path: "scores/admin.html"
    },
    {
      title: "生徒管理",
      icon: "group",
      path: "users/admin.html"
    }
  ]
};

/**
 * 現在のページが管理者ページか判定する。
 */
function getPageRole() {
  const path = location.pathname;

  if (
    /\/admin\.html$/i.test(path) ||
    /\/scores\//i.test(path) ||
    /\/users\//i.test(path)
  ) {
    return "admin";
  }

  return "student";
}

/**
 * HTMLに安全に文字列を挿入する。
 */
function escapeHTML(value) {
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

/**
 * アイコンを生成する。
 */
function createIcon(name) {
  return `
    <span
      class="material-symbols-rounded menu-icon"
      aria-hidden="true"
    >${escapeHTML(name)}</span>
  `;
}

/**
 * ログインユーザーのプロフィールを取得する。
 *
 * users/{uid} が存在しない場合は生徒扱いにする。
 * Firestore取得に失敗した場合は、権限を推測せず
 * エラーを呼び出し元に返す。
 */
async function getCurrentUserProfile(user = auth.currentUser) {
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
 * ページのログイン認証と権限を確認する。
 *
 * 戻り値:
 * { user, profile } または null
 */
function protectPage(requiredRole = null) {
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    let completed = false;

    const finish = (value, error = null) => {
      if (completed) return;

      completed = true;
      unsubscribe();

      if (error) {
        reject(error);
      } else {
        resolve(value);
      }
    };

    unsubscribe = onAuthStateChanged(
      auth,
      async user => {
        if (completed) return;

        if (!user) {
          finish(null);
          location.replace(pageUrl("login.html"));
          return;
        }

        try {
          const profile = await getCurrentUserProfile(user);

          if (completed) return;

          if (!profile) {
            finish(null);
            location.replace(pageUrl("login.html"));
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
            location.replace(pageUrl(destination));
            return;
          }

          finish({
            user,
            profile
          });
        } catch (error) {
          console.error(
            "認証・ユーザー情報取得エラー:",
            error
          );

          finish(
            null,
            new Error(
              "ユーザー情報を確認できませんでした。通信状態とFirestoreの設定を確認してください。"
            )
          );
        }
      },
      error => {
        console.error("認証状態の監視エラー:", error);

        finish(
          null,
          new Error(
            "ログイン状態を確認できませんでした。"
          )
        );
      }
    );
  });
}

/**
 * 共通レイアウトを作成する。
 */
function renderPortalShell() {
  const role = getPageRole();
  const currentPath = location.pathname;

  document.body.classList.add(
    "portal-body",
    `portal-${role}`
  );

  document.querySelector(".layout")?.remove();
  document.querySelector(".portal-shell")?.remove();

  const layout = document.createElement("div");
  layout.className = "layout";

  const currentMenu = menus[role];

  const menuHTML = currentMenu.map(item => {
    const href = pageUrl(item.path);
    const active = new URL(href).pathname === currentPath;

    return `
      <a
        class="menu-button${active ? " active" : ""}"
        href="${escapeHTML(href)}"
        title="${escapeHTML(item.title)}"
        ${active ? 'aria-current="page"' : ""}
      >
        ${createIcon(item.icon)}
        <span class="menu-text">
          ${escapeHTML(item.title)}
        </span>
      </a>
    `;
  }).join("");

  layout.innerHTML = `
    <aside class="sidebar" id="portalSidebar">

      <div class="sidebar-header">

        <div class="logo-area">
          <img
            src="${escapeHTML(pageUrl("assets/logo.svg"))}"
            class="logo"
            alt=""
            onerror="this.style.display='none'"
          >

          <span class="site-name">
            ${escapeHTML(SITE_NAME)}
          </span>
        </div>

        <button
          type="button"
          class="menu-toggle"
          id="portalMenuToggle"
          aria-label="サイドバーを折りたたむ"
          aria-expanded="true"
          title="サイドバーを折りたたむ"
        >
          <span class="material-symbols-rounded">
            menu
          </span>
        </button>

      </div>

      <nav aria-label="メインメニュー">
        ${menuHTML}

        <hr>

        <button
          type="button"
          class="menu-button"
          id="portalLogout"
        >
          ${createIcon("logout")}
          <span class="menu-text">ログアウト</span>
        </button>
      </nav>

    </aside>

    <div
      class="portal-overlay"
      id="portalOverlay"
      hidden
    ></div>

    <main class="content portal-main">

      <header class="portal-mobile-header">
        <button
          type="button"
          class="menu-toggle"
          id="mobileMenuToggle"
          aria-label="メニューを開く"
          aria-expanded="false"
        >
          <span class="material-symbols-rounded">
            menu
          </span>
        </button>

        <span>${escapeHTML(SITE_NAME)}</span>
      </header>

      <div id="portalContent"></div>

    </main>
  `;

  document.body.prepend(layout);

  setupMenu();

  return document.getElementById("portalContent");
}

/**
 * サイドバーとログアウトのイベントを設定する。
 */
function setupMenu() {
  const sidebar =
    document.getElementById("portalSidebar");

  const desktopToggle =
    document.getElementById("portalMenuToggle");

  const mobileToggle =
    document.getElementById("mobileMenuToggle");

  const overlay =
    document.getElementById("portalOverlay");

  const logoutButton =
    document.getElementById("portalLogout");

  if (!sidebar) return;

  // 保存済みの折りたたみ状態を復元する。
  let saved = null;

  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.warn("メニュー設定を読み込めません:", error);
  }

  if (saved === "true" && window.innerWidth > 768) {
    document.body.classList.add("sidebar-collapsed");
  }

  function updateDesktopToggle() {
    const collapsed =
      document.body.classList.contains("sidebar-collapsed");

    if (desktopToggle) {
      desktopToggle.setAttribute(
        "aria-expanded",
        String(!collapsed)
      );

      desktopToggle.setAttribute(
        "aria-label",
        collapsed
          ? "サイドバーを展開"
          : "サイドバーを折りたたむ"
      );
    }
  }

  function closeMobileMenu() {
    sidebar.classList.remove("mobile-open");

    document.body.classList.remove(
      "mobile-sidebar-open"
    );

    if (overlay) {
      overlay.hidden = true;
    }

    mobileToggle?.setAttribute(
      "aria-expanded",
      "false"
    );
  }

  function openMobileMenu() {
    sidebar.classList.add("mobile-open");

    document.body.classList.add(
      "mobile-sidebar-open"
    );

    if (overlay) {
      overlay.hidden = false;
    }

    mobileToggle?.setAttribute(
      "aria-expanded",
      "true"
    );
  }

  desktopToggle?.addEventListener("click", () => {
    if (window.innerWidth <= 768) {
      if (sidebar.classList.contains("mobile-open")) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }

      return;
    }

    document.body.classList.toggle("sidebar-collapsed");

    try {
      localStorage.setItem(
        STORAGE_KEY,
        String(
          document.body.classList.contains(
            "sidebar-collapsed"
          )
        )
      );
    } catch (error) {
      console.warn("メニュー設定を保存できません:", error);
    }

    updateDesktopToggle();
  });

  mobileToggle?.addEventListener("click", () => {
    if (sidebar.classList.contains("mobile-open")) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  });

  overlay?.addEventListener("click", closeMobileMenu);

  sidebar.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 768) {
        closeMobileMenu();
      }
    });
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) {
      closeMobileMenu();
    }
  });

  logoutButton?.addEventListener("click", async () => {
    const shouldLogout = window.confirm(
      "ログアウトしますか？"
    );

    if (!shouldLogout) return;

    logoutButton.disabled = true;

    try {
      await signOut(auth);
      location.replace(pageUrl("login.html"));
    } catch (error) {
      console.error("ログアウトエラー:", error);

      window.alert(
        "ログアウトに失敗しました。通信状態を確認して、もう一度お試しください。"
      );

      logoutButton.disabled = false;
    }
  });

  updateDesktopToggle();
}

// 他の画面から利用できるように公開する。
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
