const MENU_STORAGE_KEY = "portal_menu_collapsed";

function applyMenuState() {
  const collapsed =
    localStorage.getItem(MENU_STORAGE_KEY) === "true";

  document.documentElement.classList.toggle(
    "sidebar-collapsed",
    collapsed
  );

  const toggle = document.getElementById("menuToggle");

  if (toggle) {
    const icon = toggle.querySelector(
      ".material-symbols-rounded"
    );

    if (icon) {
      icon.textContent = collapsed
        ? "menu"
        : "menu_open";
    }

    toggle.setAttribute(
      "aria-label",
      collapsed
        ? "メニューを開く"
        : "メニューを閉じる"
    );
  }
}

function toggleSidebar() {
  const current =
    localStorage.getItem(MENU_STORAGE_KEY) === "true";

  localStorage.setItem(
    MENU_STORAGE_KEY,
    String(!current)
  );

  applyMenuState();
}

function openMobileMenu() {
  const sidebar =
    document.querySelector(".sidebar");

  if (!sidebar) return;

  sidebar.classList.add("mobile-open");
}

function closeMobileMenu() {
  const sidebar =
    document.querySelector(".sidebar");

  if (!sidebar) return;

  sidebar.classList.remove("mobile-open");
}

function createMobileOverlay() {
  if (document.querySelector(".sidebar-overlay")) {
    return;
  }

  const overlay =
    document.createElement("div");

  overlay.className =
    "sidebar-overlay";

  overlay.addEventListener(
    "click",
    closeMobileMenu
  );

  document.body.appendChild(overlay);
}

document.addEventListener(
  "DOMContentLoaded",
  () => {

    applyMenuState();

    createMobileOverlay();

    const toggle =
      document.getElementById("menuToggle");

    if (toggle) {

      toggle.addEventListener(
        "click",
        toggleSidebar
      );
    }

    document
      .querySelectorAll(".sidebar nav a")
      .forEach((link) => {

        link.addEventListener(
          "click",
          () => {

            if (
              window.innerWidth <= 768
            ) {
              closeMobileMenu();
            }
          }
        );
      });

  }
);

window.applyMenuState =
  applyMenuState;

window.toggleSidebar =
  toggleSidebar;

window.openMobileMenu =
  openMobileMenu;

window.closeMobileMenu =
  closeMobileMenu;
