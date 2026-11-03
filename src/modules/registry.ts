export const modules = [
  {
    id: "dashboard",
    path: "/",
    title: "Dashboard",
    icon: "home",
    eyebrow: "Benvenuto",
    description: "Dein Zuhause für große Pizza-Momente.",
    preview:
      "Hier kommen deine nächsten Schritte, laufenden Teige und persönlichen Favoriten zusammen.",
  },
  {
    id: "pizza-pilot",
    path: "/pizza-pilot",
    title: "Pizza-Pilot",
    icon: "compass",
    eyebrow: "Dein roter Faden",
    description: "Von der ersten Idee bis zur letzten Scheibe.",
    preview:
      "Hier begleitet dich später ein persönlicher Assistent durch deinen Pizza-Prozess.",
  },
  {
    id: "teigstudio",
    path: "/teigstudio",
    title: "Teigstudio",
    icon: "dough",
    eyebrow: "Mehl. Wasser. Zeit.",
    description: "Gute Pizza beginnt mit gutem Teig.",
    preview:
      "Hier entsteht später deine Werkstatt für individuelle Teige und abgestimmte Rezepturen.",
  },
  {
    id: "reife-monitor",
    path: "/reife-monitor",
    title: "Reife-Monitor",
    icon: "clock",
    eyebrow: "Die Kunst der Geduld",
    description: "Gib deinem Teig die Zeit, die er verdient.",
    preview:
      "Hier behältst du später Reifephasen und den richtigen Zeitpunkt im Blick.",
  },
  {
    id: "rezeptbibliothek",
    path: "/rezeptbibliothek",
    title: "Rezeptbibliothek",
    icon: "book",
    eyebrow: "Deine Sammlung",
    description: "Klassiker entdecken. Lieblinge bewahren.",
    preview:
      "Hier bekommen später deine Rezepte und Inspirationen einen festen Platz.",
  },
  {
    id: "pizzaabend-planer",
    path: "/pizzaabend-planer",
    title: "Pizzaabend-Planer",
    icon: "calendar",
    eyebrow: "Zusammen schmeckt’s besser",
    description: "Ein entspannter Abend beginnt mit einem guten Plan.",
    preview:
      "Hier planst du später Pizzaabende, Gäste und die passende Vorbereitung.",
  },
  {
    id: "einkaufsliste",
    path: "/einkaufsliste",
    title: "Einkaufsliste",
    icon: "bag",
    eyebrow: "Alles dabei",
    description: "Das Gute beginnt bei den Zutaten.",
    preview:
      "Hier findest du später eine übersichtliche Liste für deinen nächsten Einkauf.",
  },
  {
    id: "backcoach",
    path: "/backcoach",
    title: "Backcoach",
    icon: "flame",
    eyebrow: "Bereit für den Ofen",
    description: "Der letzte Schritt zur großen Pizza.",
    preview:
      "Hier unterstützt dich später dein Coach beim Backen und beim Umgang mit deinem Ofen.",
  },
  {
    id: "pizza-tagebuch",
    path: "/pizza-tagebuch",
    title: "Pizza-Tagebuch",
    icon: "pen",
    eyebrow: "Jede Pizza erzählt",
    description: "Halte fest, was deine Pizza besonders macht.",
    preview:
      "Hier dokumentierst du später deine Backtage, Erfahrungen und persönlichen Fortschritte.",
  },
  {
    id: "teig-doc",
    path: "/teig-doc",
    title: "Teig-Doc",
    icon: "heart",
    eyebrow: "Ein guter Rat",
    description: "Wenn dein Teig Fragen aufwirft.",
    preview:
      "Hier findest du später Orientierung bei typischen Herausforderungen mit deinem Teig.",
  },
  {
    id: "pizza-academy",
    path: "/pizza-academy",
    title: "Pizza-Academy",
    icon: "academy",
    eyebrow: "Wissen mit Geschmack",
    description: "Ein bisschen mehr verstehen. Viel besser backen.",
    preview:
      "Hier wächst später dein Wissen über Zutaten, Techniken und italienische Pizzakultur.",
  },
] as const;
export type Module = (typeof modules)[number];
export type ModuleId = Module["id"];
