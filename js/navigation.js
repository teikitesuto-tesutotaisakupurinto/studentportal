const SIDEBAR_KEY =
  "portal-sidebar-collapsed";


function applySidebarState(){

  const sidebar =
    document.getElementById("sidebar");

  if(!sidebar) return;

  const collapsed =
    localStorage.getItem(
      SIDEBAR_KEY
    ) === "true";

  document.body.classList.toggle(
    "sidebar-collapsed",
    collapsed
  );
}


window.toggleSidebar = function(){

  const collapsed =
    !document.body.classList.contains(
      "sidebar-collapsed"
    );

  localStorage.setItem(
    SIDEBAR_KEY,
    String(collapsed)
  );

  applySidebarState();
};


document.addEventListener(
  "DOMContentLoaded",
  () => {

    applySidebarState();

  }
);
