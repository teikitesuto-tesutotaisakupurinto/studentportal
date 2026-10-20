import {
  auth,
  db,
  doc,
  getDoc,
  signOut
} from "./firebase.js";

const SITE_NAME =
  "定期テスト対策プリント運営事務局|ポータルサイト";

const MENU_KEY = "portal_sidebar_collapsed";

const menus = {
  student: [
    {
      title: "ホーム",
      icon: "home",
      url: "../dashboard/student.html"
    },
    {
      title: "お知らせ",
      icon: "campaign",
      url: "../information/student.html"
    },
    {
      title: "連絡",
      icon: "mail",
      url: "../messages/student.html"
    },
    {
      title: "配布文書",
      icon: "description",
      url: "../documents/student.html"
    },
    {
      title: "カレンダー",
      icon: "calendar_month",
      url: "../calendar/student.html"
    },
    {
      title: "テスト成績",
      icon: "assignment",
      url: "../scoreForms/student.html"
    },
    {
      title: "設定",
      icon: "settings",
      url: "../student.html"
    }
  ],

  admin: [
    {
      title: "ダッシュボード",
      icon: "dashboard",
      url: "../dashboard/admin.html"
    },
    {
      title: "お知らせ管理",
      icon: "campaign",
      url: "../information/admin.html"
    },
    {
      title: "連絡管理",
      icon: "mail",
      url: "../messages/admin.html"
    },
    {
      title: "配布文書管理",
      icon: "description",
      url: "../documents/admin.html"
    },
    {
      title: "カレンダー管理",
      icon: "calendar_month",
      url: "../calendar/admin.html"
    },
    {
      title: "成績フォーム作成",
      icon: "assignment_add",
      url: "../scoreForms/admin.html"
    },
    {
      title: "成績分析",
      icon: "analytics",
      url: "../scores/admin.html"
    },
    {
      title: "生徒管理",
      icon: "group",
      url: "../users/admin.html"
    }
  ]
};

function getPageRole() {
  const path = location.pathname;

  if (
    path.includes("/admin.html") ||
    path.includes("/scores/")
  ) {
    return "admin";
  }

  return "student";
}

function createIcon(name) {
  return `
    <span class="material-symbols-rounded menu-icon">
      ${name}
    </span>
  `;
}

function renderPortalShell() {

  const role = getPageRole();

  document.body.classList.add(
    "portal-body",
    `portal-${role}`
  );

  const old = document.querySelector(".portal-shell");

  if (old) {
    old.remove();
  }

  const shell = document.createElement("div");

  shell.className = "portal-shell";

  shell.innerHTML = `
    <aside class="portal-sidebar">

      <div class="portal-sidebar-top">

        <div class="portal-logo-area">

          <img
            src="../assets/logo.svg"
            class="portal-logo"
            alt="定期テスト対策プリント"
          >

          <div class="portal-site-name">
            ${SITE_NAME}
          </div>

        </div>

        <button
          type="button"
          class="portal-menu-toggle"
          id="portalMenuToggle"
          aria-label="メニューを開閉"
          title="メニューを開閉"
        >
          <span class="material-symbols-rounded">
            menu
          </span>
        </button>

      </div>

      <nav class="portal-nav">

        ${menus[role].map(item => `
          <a
            class="portal-nav-item"
            href="${item.url}"
            title="${item.title}"
          >
            ${createIcon(item.icon)}
            <span class="portal-nav-text">
              ${item.title}
            </span>
          </a>
        `).join("")}

      </nav>

      <div class="portal-sidebar-bottom">

        <button
          type="button"
          class="portal-logout-button"
          id="portalLogout"
          title="ログアウト"
        >
          ${createIcon("logout")}
          <span class="portal-nav-text">
            ログアウト
          </span>
        </button>

      </div>

    </aside>

    <main class="portal-main">

      <header class="portal-mobile-header">

        <button
          type="button"
          id="mobileMenuToggle"
          class="portal-mobile-menu"
        >
          <span class="material-symbols-rounded">
            menu
          </span>
        </button>

        <div>
          ${SITE_NAME}
        </div>

      </header>

      <div class="portal-page">
        <div id="portalContent"></div>
      </div>

    </main>

    <div
      id="portalOverlay"
      class="portal-overlay"
    ></div>
  `;

  document.body.prepend(shell);

  setupMenu();

  return document.getElementById("portalContent");
}

function setupMenu() {

  const sidebar =
    document.querySelector(".portal-sidebar");

  const toggle =
    document.getElementById("portalMenuToggle");

  const mobileToggle =
    document.getElementById("mobileMenuToggle");

  const overlay =
    document.getElementById("portalOverlay");

  const logoutButton =
    document.getElementById("portalLogout");

  const saved =
    localStorage.getItem(MENU_KEY);

  if (saved === "true") {
    document.body.classList.add(
      "sidebar-collapsed"
    );
  }

  toggle?.addEventListener(
    "click",
    () => {

      document.body.classList.toggle(
        "sidebar-collapsed"
      );

      localStorage.setItem(
        MENU_KEY,
        document.body.classList.contains(
          "sidebar-collapsed"
        )
      );
    }
  );

  mobileToggle?.addEventListener(
    "click",
    () => {

      document.body.classList.toggle(
        "mobile-sidebar-open"
      );
    }
  );

  overlay?.addEventListener(
    "click",
    () => {

      document.body.classList.remove(
        "mobile-sidebar-open"
      );
    }
  );

  logoutButton?.addEventListener(
    "click",
    async () => {

      try {

        await signOut(auth);

        location.href =
          "../login.html";

      } catch (error) {

        console.error(error);

        alert(
          "ログアウトに失敗しました。"
        );
      }
    }
  );

  window.addEventListener(
    "resize",
    () => {

      if (window.innerWidth > 768) {

        document.body.classList.remove(
          "mobile-sidebar-open"
        );
      }

    }
  );
}

async function getCurrentUserProfile() {

  const user = auth.currentUser;

  if (!user) {
    return null;
  }

  try {

    const ref =
      doc(db, "users", user.uid);

    const snap =
      await getDoc(ref);

    if (!snap.exists()) {

      return {
        uid: user.uid,
        email: user.email || "",
        displayName:
          user.displayName || "",
        role: "student"
      };
    }

    return {
      uid: user.uid,
      ...snap.data()
    };

  } catch (error) {

    console.error(
      "ユーザー情報取得エラー:",
      error
    );

    return {
      uid: user.uid,
      email: user.email || "",
      displayName:
        user.displayName || "",
      role: "student"
    };
  }
}

function protectPage(requiredRole = null) {

  return new Promise(resolve => {

    if (!auth) {
      location.href =
        "../login.html";
      return;
    }

    const unsubscribe =
      auth.onAuthStateChanged(
        async user => {

          if (!user) {

            unsubscribe();

            location.href =
              "../login.html";

            return;
          }

          const profile =
            await getCurrentUserProfile();

          if (
            requiredRole &&
            profile?.role !== requiredRole
          ) {

            alert(
              "このページを利用する権限がありません。"
            );

            location.href =
              requiredRole === "admin"
                ? "../dashboard/admin.html"
                : "../dashboard/student.html";

            return;
          }

          unsubscribe();

          resolve({
            user,
            profile
          });
        }
      );

  });
}

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
  renderPortalShell,
  setupMenu,
  getCurrentUserProfile,
  protectPage
};
