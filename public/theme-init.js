/* Blocking head script: resolve the theme before CSS/React paints. No app data is touched. */
(function (window, document) {
  if (window.fornoTheme) return;
  var key = "forno:theme:v1";
  var media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  var listeners = new Set();
  var choice = "system";
  var persistent = true;
  function valid(value) { return value === "light" || value === "dark" || value === "system"; }
  try { var saved = window.localStorage.getItem(key); if (valid(saved)) choice = saved; }
  catch (_) { persistent = false; }
  var resolved;
  function apply() {
    resolved = choice === "system" ? (media && media.matches ? "dark" : "light") : choice;
    var background = resolved === "dark" ? "#1B1B1B" : "#F9F6F1";
    var root = document.documentElement;
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;
    root.style.backgroundColor = background;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", background);
    var status = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (status) status.setAttribute("content", resolved === "dark" ? "black-translucent" : "default");
    listeners.forEach(function (listener) { listener(); });
  }
  function systemChanged() { if (choice === "system") apply(); }
  function storageChanged(event) {
    if (event.key !== key && event.key !== null) return;
    choice = valid(event.newValue) ? event.newValue : "system";
    apply();
  }
  if (media) {
    if (media.addEventListener) media.addEventListener("change", systemChanged);
    else if (media.addListener) media.addListener(systemChanged);
  }
  window.addEventListener("storage", storageChanged);
  window.fornoTheme = {
    getSnapshot: function () { return choice + "|" + resolved + "|" + persistent; },
    subscribe: function (listener) { listeners.add(listener); return function () { listeners.delete(listener); }; },
    setChoice: function (value) {
      if (!valid(value)) return;
      choice = value;
      try { window.localStorage.setItem(key, value); persistent = true; }
      catch (_) { persistent = false; }
      apply();
    },
    dispose: function () {
      window.removeEventListener("storage", storageChanged);
      if (media) {
        if (media.removeEventListener) media.removeEventListener("change", systemChanged);
        else if (media.removeListener) media.removeListener(systemChanged);
      }
      listeners.clear();
    }
  };
  apply();
})(window, document);
