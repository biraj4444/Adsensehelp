/* Runs before first paint so the saved reading theme never flashes. */
(function () {
  try {
    var s = JSON.parse(localStorage.getItem("adh-reader") || "{}"), d = document.documentElement;
    var theme = s.theme || (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    d.setAttribute("data-theme", theme);
    if (s.font) d.setAttribute("data-font", s.font);
    if (s.width) d.setAttribute("data-width", s.width);
    if (s.size) d.style.setProperty("--rm-size", s.size + "px");
    if (s.leading) d.style.setProperty("--rm-leading", s.leading);
  } catch (e) { document.documentElement.setAttribute("data-theme", "light"); }
})();
