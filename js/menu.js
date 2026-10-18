const STORAGE_KEY =
  "studentportal_sidebar_collapsed";

const BASE =
  "/studentportal/";

const MENU_ITEMS = {

  admin:[
    ["dashboard","home","ホーム","dashboard/admin.html"],
    ["information","campaign","お知らせ","information/admin.html"],
    ["messages","mail","連絡","messages/admin.html"],
    ["documents","description","配布文書","documents/admin.html"],
    ["calendar","calendar_month","カレンダー","calendar/admin.html"],
    ["scoreForms","assignment","成績フォーム","scoreForms/admin.html"],
    ["scores","analytics","成績分析","scores/admin.html"],
    ["users","group","生徒管理","users/admin.html"]
  ],

  student:[
    ["dashboard","home","ホーム","dashboard/student.html"],
    ["information","campaign","お知らせ","information/student.html"],
    ["messages","mail","連絡","messages/student.html"],
    ["documents","description","配布文書","documents/student.html"],
    ["calendar","calendar_month","カレンダー","calendar/student.html"],
    ["scoreForms","assignment","テスト成績","scoreForms/student.html"],
    ["settings","settings","設定","student.html"]
  ]

};

function getRole(){

  return document.body.dataset.role === "admin"
    ? "admin"
    : "student";
}

function getCurrentPath(){

  return location.pathname
    .replace(BASE,"")
    .replace(/^\/+/,"");

}

function isActive(path){

  return getCurrentPath() === path;

}

function createMenu(){

  const sidebar =
    document.getElementById("sidebar");

  if(!sidebar) return;

  const role =
    getRole();

  const items =
    MENU_ITEMS[role];

  const collapsed =
    localStorage.getItem(STORAGE_KEY) === "true";

  sidebar.classList.toggle(
    "collapsed",
    collapsed
  );

  sidebar.innerHTML = `

    <div class="sidebar-top">

      <button
        type="button"
        id="menuToggle"
        class="menu-toggle"
        aria-label="メニューを開閉">

        <span class="material-symbols-rounded">
          ${collapsed ? "menu" : "menu_open"}
        </span>

      </button>

      <div class="sidebar-brand">
        定期テスト対策プリント運営事務局
      </div>

    </div>

    <nav>

      ${items.map(item => {

        const [
          key,
          icon,
          label,
          href
        ] = item;

        const active =
          isActive(href)
            ? "active"
            : "";

        return `

          <a
            href="${BASE}${href}"
            class="menu-item ${active}"
            title="${label}">

            <span class="material-symbols-rounded">
              ${icon}
            </span>

            <span class="menu-label">
              ${label}
            </span>

          </a>

        `;

      }).join("")}

      <hr class="sidebar-divider">

      <button
        type="button"
        class="menu-item"
        id="logoutButton">

        <span class="material-symbols-rounded">
          logout
        </span>

        <span class="menu-label">
          ログアウト
        </span>

      </button>

    </nav>
  `;

  document
    .getElementById("menuToggle")
    ?.addEventListener(
      "click",
      toggleMenu
    );

  document
    .getElementById("logoutButton")
    ?.addEventListener(
      "click",
      () => window.logout()
    );
}

function toggleMenu(){

  const sidebar =
    document.getElementById("sidebar");

  if(!sidebar) return;

  const collapsed =
    !sidebar.classList.contains("collapsed");

  sidebar.classList.toggle(
    "collapsed",
    collapsed
  );

  localStorage.setItem(
    STORAGE_KEY,
    String(collapsed)
  );

  const icon =
    document.querySelector(
      "#menuToggle .material-symbols-rounded"
    );

  if(icon){

    icon.textContent =
      collapsed
        ? "menu"
        : "menu_open";

  }

}

window.togglePortalMenu =
  toggleMenu;

document.addEventListener(
  "DOMContentLoaded",
  createMenu
);
