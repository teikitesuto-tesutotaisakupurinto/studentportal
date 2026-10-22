
/**
 * Student Portal
 * 共通レイアウト・アクセス制御・ナビゲーション
 *
 * 保存先: js/portal.js
 */

import {
  auth,
  db,
  doc,
  getDoc,
  onAuthStateChanged,
  signOut
} from "./firebase.js";

/* =====================================================
   1. 共通設定
   ===================================================== */

const LOGIN_PATH = "/login.html";

const menus = [
  {
    label: "ホーム",
    href: "/index.html",
    icon: "🏠",
    roles: ["admin", "student"]
  },
  {
    label: "ダッシュボード",
    href: "/dashboard/admin.html",
    icon: "📊",
    roles: ["admin"]
  },
  {
    label: "マイダッシュボード",
    href: "/dashboard/student.html",
    icon: "👤",
    roles: ["student"]
  },
  {
    label: "学校からのお知らせ",
    href: "/information/index.html",
    icon: "📢",
    roles: ["admin", "student"]
  },
  {
    label: "配布資料",
    href: "/documents/index.html",
    icon: "📁",
    roles: ["admin", "student"]
  },
  {
    label: "学校カレンダー",
    href: "/calendar/index.html",
    icon: "📅",
    roles: ["admin", "student"]
  },
  {
    label: "成績・テスト",
    href: "/scores/index.html",
    icon: "📝",
    roles: ["admin", "student"]
  },
  {
    label: "メッセージ",
    href: "/messages/index.html",
    icon: "💬",
    roles: ["admin", "student"]
  },
  {
    label: "ユーザー管理",
    href: "/users/index.html",
    icon: "👥",
    roles: ["admin"]
  }
];

/* =====================================================
   2. URL の処理
   ===================================================== */

function getAppBaseUrl() {
  const currentUrl = new URL(import.meta.url);

  // /js/portal.js の1階層上をアプリのルートとする。
  return new URL("../", currentUrl);
}

function getAppPath(path) {
  const baseUrl = getAppBaseUrl();
  return new URL(path.replace(/^\/+/, ""), baseUrl).href;
}

function getCurrentRelativePath() {
  const baseUrl = getAppBaseUrl();
  const currentUrl = new URL(window.location.href);

  if (currentUrl.origin !== baseUrl.origin) {
    return currentUrl.pathname;
  }

  return currentUrl.pathname.startsWith(baseUrl.pathname)
    ? currentUrl.pathname.slice(baseUrl.pathname.length)
    : currentUrl.pathname.replace(/^\/+/, "");
}

function isLoginPage() {
  return getCurrentRelativePath() === "login.html";
}

/* =====================================================
   3. 認証状態
   ===================================================== */

export function waitForCurrentUser() {
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

/* =====================================================
   4. ユーザープロフィール・権限
   ===================================================== */

export async function getCurrentUserProfile(user = auth.currentUser) {
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
  const profile = await getCurrentUserProfile(user);
  return profile?.role || null;
}

/* =====================================================
   5. ログイン画面への移動
   ===================================================== */

export function redirectToLogin() {
  const loginUrl = new URL(
    getAppPath("login.html")
  );

  const currentUrl = new URL(window.location.href);
  const currentPath = getCurrentRelativePath();

  if (currentPath && currentPath !== "login.html") {
    loginUrl.searchParams.set(
      "returnUrl",
      currentUrl.href
    );
  }

  window.location.replace(loginUrl.href);
}

/* =====================================================
   6. ログイン後の移動先
   ===================================================== */

export async function redirectUser(user = auth.currentUser) {
  if (!user) {
    redirectToLogin();
    return;
  }

  try {
    const profile = await getCurrentUserProfile(user);

    const destination = profile?.role === "admin"
      ? "dashboard/admin.html"
      : "dashboard/student.html";

    window.location.replace(getAppPath(destination));
  } catch (error) {
    console.error("ユーザー権限の取得に失敗しました:", error);

    // 権限情報を取得できないときは管理者画面に進ませない。
    window.location.replace(getAppPath("dashboard/student.html"));
  }
}

/* =====================================================
   7. ページのアクセス制御
   ===================================================== */

/**
 * expectedRole:
 * "admin"   管理者のみ
 * "student" 生徒のみ
 * "login"   ログイン済みユーザーならアクセス可能
 */
export async function protectPage(expectedRole = "login") {
  let user;

  try {
    user = await waitForCurrentUser();
  } catch (error) {
    console.error("ログイン状態を確認できません:", error);
    redirectToLogin();
    return null;
  }

  if (!user) {
    redirectToLogin();
    return null;
  }

  let profile;

  try {
    profile = await getCurrentUserProfile(user);
  } catch (error) {
    console.error("ユーザー権限を確認できません:", error);

    const status = document.getElementById("systemStatus");

    if (status) {
      status.textContent =
        "アカウント情報を確認できません。管理者にお問い合わせください。";
    }

    return null;
  }

  const role = profile?.role || "student";

  if (expectedRole === "admin" && role !== "admin") {
    window.location.replace(getAppPath("dashboard/student.html"));
    return null;
  }

  if (expectedRole === "student" && role !== "student") {
    window.location.replace(getAppPath("dashboard/admin.html"));
    return null;
  }

  return user;
}

export async function requireLogin() {
  return protectPage("login");
}

export async function requireAdmin() {
  return protectPage("admin");
}

export async function requireStudent() {
  return protectPage("student");
}

/* =====================================================
   8. メニュー描画
   ===================================================== */

function createMenuItem(item, currentPath) {
  const link = document.createElement("a");

  link.className = "portal-menu-link";
  link.href = getAppPath(item.href);
  link.dataset.menuHref = item.href;

  const normalizedPath = item.href.replace(/^\/+/, "");

  if (currentPath === normalizedPath) {
    link.classList.add("active");
    link.setAttribute("aria-current", "page");
  }

  const icon = document.createElement("span");
  icon.className = "portal-menu-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = item.icon;

  const label = document.createElement("span");
  label.className = "portal-menu-label";
  label.textContent = item.label;

  link.append(icon, label);

  return link;
}

function createPortalLayout(profile) {
  const layout = document.createElement("div");
  layout.className = "portal-layout";

  const sidebar = document.createElement("aside");
  sidebar.className = "portal-sidebar";
  sidebar.id = "portalSidebar";
  sidebar.setAttribute("aria-label", "メインナビゲーション");

  const brand = document.createElement("a");
  brand.className = "portal-brand";
  brand.href = getAppPath("index.html");

  const brandIcon = document.createElement("span");
  brandIcon.className = "portal-brand-icon";
  brandIcon.textContent = "S";
  brandIcon.setAttribute("aria-hidden", "true");

  const brandName = document.createElement("span");
  brandName.className = "portal-brand-name";
  brandName.textContent = "Student Portal";

  brand.append(brandIcon, brandName);

  const profileBox = document.createElement("div");
  profileBox.className = "portal-profile";

  const profileName = document.createElement("div");
  profileName.className = "portal-profile-name";
  profileName.textContent =
    profile.displayName ||
    profile.email ||
    "ログインユーザー";

  const profileRole = document.createElement("div");
  profileRole.className = "portal-profile-role";
  profileRole.textContent =
    profile.role === "admin" ? "管理者" : "生徒";

  profileBox.append(profileName, profileRole);

  const nav = document.createElement("nav");
  nav.className = "portal-menu";

  const currentPath = getCurrentRelativePath();

  menus
    .filter(item => item.roles.includes(profile.role))
    .forEach(item => {
      nav.appendChild(createMenuItem(item, currentPath));
    });

  const sidebarFooter = document.createElement("div");
  sidebarFooter.className = "portal-sidebar-footer";

  const logoutButton = document.createElement("button");
  logoutButton.type = "button";
  logoutButton.className = "portal-logout-button";
  logoutButton.id = "portalLogoutButton";
  logoutButton.textContent = "ログアウト";

  sidebarFooter.appendChild(logoutButton);

  sidebar.append(brand, profileBox, nav, sidebarFooter);

  const main = document.createElement("div");
  main.className = "portal-main";

  const mobileHeader = document.createElement("header");
  mobileHeader.className = "portal-mobile-header";

  const menuButton = document.createElement("button");
  menuButton.type = "button";
  menuButton.className = "portal-mobile-menu-button";
  menuButton.id = "portalMobileMenuButton";
  menuButton.textContent = "☰ メニュー";
  menuButton.setAttribute("aria-controls", "portalSidebar");
  menuButton.setAttribute("aria-expanded", "false");

  const mobileTitle = document.createElement("span");
  mobileTitle.className = "portal-mobile-title";
  mobileTitle.textContent = "Student Portal";

  mobileHeader.append(menuButton, mobileTitle);

  const content = document.createElement("div");
  content.className = "portal-content";

  // 既存のページ本文を移動して保持する。
  const existingRoot = document.getElementById("portalRoot");
  const existingChildren = existingRoot
    ? Array.from(existingRoot.childNodes)
    : [];

  existingChildren.forEach(child => {
    if (child !== layout) {
      content.appendChild(child);
    }
  });

  main.append(mobileHeader, content);
  layout.append(sidebar, main);

  const overlay = document.createElement("button");
  overlay.type = "button";
  overlay.className = "portal-overlay";
  overlay.id = "portalOverlay";
  overlay.setAttribute("aria-label", "メニューを閉じる");

  return { layout, overlay };
}

/* =====================================================
   9. 共通レイアウトの描画
   ===================================================== */

let shellPromise = null;

export async function renderPortalShell() {
  if (shellPromise) {
    return shellPromise;
  }

  shellPromise = (async () => {
    const user = auth.currentUser;

    if (!user) {
      return false;
    }

    const profile = await getCurrentUserProfile(user);

    if (!profile) {
      return false;
    }

    // すでにレイアウトがある場合は重複して作らない。
    if (document.querySelector(".portal-layout")) {
      setupMenu();
      return true;
    }

    const { layout, overlay } = createPortalLayout(profile);

    document.body.classList.add("portal-page");
    document.body.append(layout, overlay);

    setupMenu();

    return true;
  })();

  try {
    return await shellPromise;
  } catch (error) {
    shellPromise = null;
    throw error;
  }
}

/* =====================================================
   10. メニュー・ログアウト
   ===================================================== */

export function setupMenu() {
  const sidebar = document.getElementById("portalSidebar");
  const menuButton = document.getElementById("portalMobileMenuButton");
  const overlay = document.getElementById("portalOverlay");
  const logoutButton = document.getElementById("portalLogoutButton");

  function closeMenu() {
    document.body.classList.remove("portal-menu-open");

    if (menuButton) {
      menuButton.setAttribute("aria-expanded", "false");
    }
  }

  function openMenu() {
    document.body.classList.add("portal-menu-open");

    if (menuButton) {
      menuButton.setAttribute("aria-expanded", "true");
    }
  }

  if (menuButton && menuButton.dataset.initialized !== "true") {
    menuButton.dataset.initialized = "true";

    menuButton.addEventListener("click", () => {
      const isOpen =
        document.body.classList.contains("portal-menu-open");

      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });
  }

  if (overlay && overlay.dataset.initialized !== "true") {
    overlay.dataset.initialized = "true";
    overlay.addEventListener("click", closeMenu);
  }

  if (sidebar && sidebar.dataset.initialized !== "true") {
    sidebar.dataset.initialized = "true";

    sidebar.addEventListener("click", event => {
      if (event.target.closest("a")) {
        closeMenu();
      }
    });
  }

  if (logoutButton && logoutButton.dataset.initialized !== "true") {
    logoutButton.dataset.initialized = "true";

    logoutButton.addEventListener("click", async () => {
      logoutButton.disabled = true;
      logoutButton.textContent = "ログアウト中…";

      try {
        await signOut(auth);
        window.location.replace(getAppPath("login.html"));
      } catch (error) {
        console.error("ログアウトに失敗しました:", error);

        logoutButton.disabled = false;
        logoutButton.textContent = "ログアウト";

        alert("ログアウトに失敗しました。もう一度お試しください。");
      }
    });
  }

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });
}

/* =====================================================
   11. ログインページの初期化
   ===================================================== */

if (isLoginPage()) {
  onAuthStateChanged(auth, user => {
    if (!user) {
      return;
    }

    // ログイン画面にログイン済みユーザーが来た場合、
    // 権限に応じた画面へ移動する。
    redirectUser(user);
  });
}
