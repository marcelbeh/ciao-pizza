/** Editorial, local-only knowledge. Stable IDs are the contract for links and future P7 context. */
export const categories = [
  "Zutaten",
  "Teigführung",
  "Handwerk",
  "Backen",
] as const;
export type Category = (typeof categories)[number];
export interface ArticleSection {
  id: string;
  title: string;
  paragraphs: string[];
}
export interface Article {
  id: string;
  title: string;
  category: Category;
  summary: string;
  tags: string[];
  sections: ArticleSection[];
  sourceIds: string[];
}
export const sources = {
  flour: {
    title: "KPM Analytics · What is Baking Strength",
    url: "https://www.kpmanalytics.com/blog/what-is-baking-strength",
  },
  hydration: {
    title: "Ooni · Pizza Dough Hydration Explained",
    url: "https://ooni.com/blogs/ooni-insights/pizza-dough-hydration-explained",
  },
  yeast: {
    title: "BCcampus · Using Yeast",
    url: "https://opentextbc.ca/ingredients/chapter/using-yeast/",
  },
  bulk: {
    title: "King Arthur Baking · Bulk fermentation",
    url: "https://www.kingarthurbaking.com/blog/2019/07/22/bulk-fermentation",
  },
  proof: {
    title: "American Society of Baking · Final Proof",
    url: "https://asbe.org/article/final-proof/",
  },
  temperature: {
    title: "King Arthur Baking · Dough Temperature",
    url: "https://www.kingarthurbaking.com/pro/reference/dough-temperature",
  },
  knead: {
    title: "King Arthur Baking · High-hydration doughs",
    url: "https://www.kingarthurbaking.com/blog/2021/08/30/5-tips-for-working-with-high-hydration-doughs",
  },
  shape: {
    title: "King Arthur Baking · Stretching pizza dough",
    url: "https://www.kingarthurbaking.com/blog/2024/02/14/how-to-stretch-pizza-dough",
  },
  skin: {
    title: "Ooni · Keeping dough covered",
    url: "https://ooni.com/pages/help-center?a=My-dough-is-dried-out-there%27s-skin-on-my-dough-ball---id--VnlrKtQMQUKy_AWURyCyvw",
  },
  oven: {
    title: "Ooni · Your first pizza",
    url: "https://ooni.com/blogs/ooni-insights/how-to-make-your-first-ooni-pizza",
  },
  launch: {
    title: "Ooni · Tips for launching pizza",
    url: "https://au.ooni.com/blogs/recipes/10-tips-for-launching-the-perfect-pizza",
  },
  avpn: {
    title: "AVPN · Disciplinare 2022",
    url: "https://www.pizzanapoletana.org/public/pdf/Disciplinare_AVPN_2022.pdf",
  },
  ny: {
    title: "King Arthur Baking · New York-style pizza",
    url: "https://www.kingarthurbaking.com/recipes/new-york-style-pizza-recipe",
  },
} as const;
export const contentVersion = "2026-11-03.1";
const section = (
  id: string,
  title: string,
  ...paragraphs: string[]
): ArticleSection => ({ id, title, paragraphs });
export const articles: Article[] = [
  {
    id: "mehl",
    title: "Mehl & W-Wert verstehen",
    category: "Zutaten",
    summary: "Stärke, Dehnbarkeit und Mehltypen sinnvoll einordnen.",
    tags: ["Mehlprofil", "Protein", "Tipo 00", "W-Wert"],
    sourceIds: ["flour"],
    sections: [
      section(
        "staerke",
        "Was W wirklich sagt",
        "Der W-Wert beschreibt die im Alveographen gemessene Verformungsarbeit eines standardisierten Teigs. Ein höherer Wert steht für mehr Backstärke, aber nicht automatisch für die bessere Pizza. P/L ergänzt das Verhältnis von Widerstand zu Dehnbarkeit.",
      ),
      section(
        "auswahl",
        "Mehl passend zur Führung wählen",
        "Tipo 00 und deutsche Typenzahlen beschreiben nicht dieselbe Eigenschaft wie W. Auch der Proteingehalt allein ersetzt keine Angaben zur Teigstabilität. Nutze das Mehlprofil und die Verarbeitungshinweise der Mühle; teste Wasser und lange Führungen schrittweise, statt aus W eine exakte Stundenzahl abzuleiten.",
      ),
    ],
  },
  {
    id: "hydration",
    title: "Hydration: Wasser in Balance",
    category: "Zutaten",
    summary: "Bäckerprozente lesen und Wasser an Mehl und Ofen anpassen.",
    tags: ["Wasser", "Bäckerprozente", "klebrig"],
    sourceIds: ["hydration"],
    sections: [
      section(
        "prozent",
        "Die Mehlmenge ist die Basis",
        "Hydration = Wassermasse ÷ Mehlmasse × 100. Bei 1.000 g Mehl und 650 g Wasser sind es 65 %. Salz, Öl und Hefe zählen zur Gesamtmasse, aber nicht zum Wasseranteil. Ciao! berücksichtigt diese Zutaten in der Teigmenge.",
      ),
      section(
        "anpassen",
        "Mehr Wasser braucht mehr Kontrolle",
        "Mehr Wasser macht den Teig meist weicher und die Handhabung anspruchsvoller. Es garantiert keine größere Porung. Mehl, Aufbau des Glutengerüsts, Gare und Backleistung müssen zusammenpassen. Ändere für einen Vergleich nur wenige Prozentpunkte und notiere das Ergebnis.",
      ),
    ],
  },
  {
    id: "hefe",
    title: "Hefe dosieren",
    category: "Zutaten",
    summary: "Hefearten unterscheiden und Richtwerte bewusst verwenden.",
    tags: ["Frischhefe", "Trockenhefe", "Instanthefe"],
    sourceIds: ["yeast"],
    sections: [
      section(
        "arten",
        "Frisch ist nicht gleich trocken",
        "Frischhefe enthält mehr Wasser als Trockenhefe. Ciao! nutzt für Instant-Trockenhefe grob ein Drittel der Frischhefemasse. Das ist eine Orientierung; die Dosier- und Aktivierungshinweise des Herstellers gehen vor. Aktive Trockenhefe ist nicht automatisch identisch mit Instanthefe.",
      ),
      section(
        "richtwert",
        "Keine Grammzahl verspricht eine perfekte Gare",
        "Hefefrische, Temperatur, Salz und Zeit verändern die Triebkraft. Verwende bei sehr kleinen Mengen eine geeignete Feinwaage. Eine rechnerisch fein aufgelöste Anzeige ist keine Garantie für eine entsprechend genaue Gärprognose.",
      ),
    ],
  },
  {
    id: "fermentation",
    title: "Fermentation & kalte Führung",
    category: "Teigführung",
    summary: "Warum Zeit allein noch keine Teigreife beschreibt.",
    tags: ["Reifung", "Kühlschrank", "Langzeitführung"],
    sourceIds: ["bulk", "temperature"],
    sections: [
      section(
        "grundlagen",
        "Gas, Aroma und Struktur",
        "Hefe bildet bei der Vergärung verfügbarer Zucker unter anderem Kohlendioxid. Das Glutengerüst hält Gas zurück; gleichzeitig verändern enzymatische Prozesse den Teig. Mehr Zeit ist nicht unbegrenzt besser: Ein instabiles Gerüst hält das Gas irgendwann schlechter.",
      ),
      section(
        "kalt",
        "Kälte bremst, stoppt aber nicht sofort",
        "Die Kühlschrankluft ist nicht die Kerntemperatur eines großen Teigstücks. Der Teig kühlt verzögert ab und gärt dabei weiter. In Ciao! folgen bei Kaltführung warme Stockgare, kalte Stockgare und warme Stückgare aufeinander. Planzeiten sind Vorgaben, keine Messwerte. Beobachte Volumen, Gasblasen und Stabilität gemeinsam.",
      ),
    ],
  },
  {
    id: "gare",
    title: "Stockgare & Stückgare",
    category: "Teigführung",
    summary: "Zwei Phasen, ein fortlaufender Prozess.",
    tags: ["Stockgare", "Stückgare", "Untergare", "Übergare"],
    sourceIds: ["bulk", "proof"],
    sections: [
      section(
        "stockgare",
        "Stockgare: der Teig als Ganzes",
        "Die Stockgare ist die Ruhe- und Gärphase vor dem Portionieren. Je nach Rezept helfen schonende Faltungen, Struktur aufzubauen. Häufiges Bearbeiten kurz vor dem Formen drückt dagegen Gas heraus. Volumenzunahme und Teiggefühl ergänzen die Uhr.",
      ),
      section(
        "stueckgare",
        "Stückgare: bereit zum Ausziehen",
        "Nach dem Teilen und Rundwirken entspannen die einzelnen Teiglinge und entwickeln weiter Gas. Untergare kann sich durch einen dichten, widerspenstigen Teig zeigen; bei Übergare kann er stark verlaufen und leicht reißen. Diese Zeichen sind nicht eindeutig. Temperatur, Mehl und vorherige Bearbeitung mitbetrachten; kein einzelner Fingertest liefert einen universellen Reifewert.",
      ),
    ],
  },
  {
    id: "kneten",
    title: "Kneten & Falten",
    category: "Handwerk",
    summary: "Struktur aufbauen, ohne den Teig zu überhitzen.",
    tags: ["Gluten", "Fenstertest", "Falten"],
    sourceIds: ["knead", "bulk"],
    sections: [
      section(
        "struktur",
        "Vom Mischen zum Gerüst",
        "Mischen verteilt die Zutaten; Kneten und Ruhe unterstützen die Ausbildung des Glutengerüsts. Ein zusammenhängender, elastischer Teig ist hilfreicher als eine starre Minutenvorgabe. Sehr weiche Teige lassen sich oft durch Ruhe und Falten besser beherrschen als durch immer mehr Mehl.",
      ),
      section(
        "grenzen",
        "Rechtzeitig aufhören",
        "Maschine, Menge und Mehl verändern die nötige Bearbeitung. Prüfe die Teigtemperatur zwischendurch. Wird ein zuvor stabiler Teig beim Weiterkneten zunehmend schmierig und schwach, pausiere und prüfe Überwärmung statt blind weiterzukneten. Ein vorsichtiger Dehntest ist eine Orientierung, kein Muss für jedes Pizzarezept.",
      ),
    ],
  },
  {
    id: "teigtemperatur",
    title: "Teigtemperatur steuern",
    category: "Teigführung",
    summary: "Wasser, Raum und Knetwärme zusammen betrachten.",
    tags: ["Wassertemperatur", "Raumtemperatur", "Zielteigtemperatur"],
    sourceIds: ["temperature"],
    sections: [
      section(
        "messen",
        "Den Teig messen",
        "Für die Gärung ist die tatsächliche Teigtemperatur aussagekräftiger als die Raumluft allein. Mehl, Wasser, Raum und Knetwärme beeinflussen sie. Miss nach dem Kneten im Teig und notiere den Wert im Tagebuch. Die Zieltemperatur im Plan ist keine automatisch erreichte Temperatur.",
      ),
      section(
        "wasser",
        "Wasser als Stellschraube",
        "Wähle bei warmer Umgebung oder starker Knetwärme kühleres Wasser; passe beim nächsten Versuch anhand der Messung an. Kühlschranktemperatur und Abkühlzeit ebenfalls beachten. Kleine Temperaturunterschiede können den Ablauf verändern; eine pauschale Minutenkorrektur wäre irreführend.",
      ),
    ],
  },
  {
    id: "teiglinge",
    title: "Teiglinge portionieren & schützen",
    category: "Handwerk",
    summary: "Gleichmäßige Portionen und eine geschmeidige Oberfläche.",
    tags: ["Rundwirken", "Ballen", "Haut", "Abdecken"],
    sourceIds: ["skin", "proof"],
    sections: [
      section(
        "portionieren",
        "Wiegen und sanft rundwirken",
        "Gleich schwere Portionen erleichtern vergleichbare Backergebnisse. Forme eine geschlossene Oberfläche, ohne sie straff zu zerreißen. Gib den Ballen genügend Abstand und Zeit zur Entspannung; nachträgliches Rundwirken setzt die Entspannung praktisch zurück.",
      ),
      section(
        "abdecken",
        "Austrocknen vermeiden",
        "Bewahre die Teiglinge abgedeckt in geeigneten Lebensmittelbehältern auf. Eine trockene Haut lässt sich schlecht dehnen und kann reißen. Der Deckel schützt vor Luftzug; die Teiglinge dürfen bei ihrer Volumenzunahme nicht eingequetscht werden.",
      ),
    ],
  },
  {
    id: "ausziehen",
    title: "Pizza sanft ausziehen",
    category: "Handwerk",
    summary: "Mit entspannter Struktur statt mit Kraft arbeiten.",
    tags: ["Formen", "reißt", "zieht sich zurück"],
    sourceIds: ["shape", "launch"],
    sections: [
      section(
        "technik",
        "Von innen nach außen",
        "Löse den Ballen vorsichtig, bemehle sparsam und drücke vom Zentrum nach außen. Für einen luftigen Rand diesen nicht plattdrücken. Dehne gleichmäßig; vermeide eine papierdünne Mitte. Zu viel loses Mehl verbrennt beim Backen leicht.",
      ),
      section(
        "entspannen",
        "Wenn der Teig zurückzieht",
        "Kurz abgedeckt ruhen lassen und erneut versuchen, statt stärker zu ziehen. Kalter oder frisch rundgewirkter Teig braucht oft mehr Entspannung. Reißt er, kann auch zu wenig Struktur oder zu lange Gare beteiligt sein. Erst unmittelbar vor dem Backen belegen und prüfen, ob die Pizza auf der Schaufel gleitet.",
      ),
    ],
  },
  {
    id: "belaege",
    title: "Beläge in Balance",
    category: "Zutaten",
    summary: "Feuchtigkeit und Menge entscheiden mit über den Boden.",
    tags: ["Mozzarella", "Tomaten", "Gemüse", "Sauce"],
    sourceIds: ["oven", "launch"],
    sections: [
      section(
        "feuchtigkeit",
        "Weniger Last, gleichmäßigeres Backen",
        "Verteile Sauce und Beläge dünn und gleichmäßig. Lasse sehr feuchten Mozzarella abtropfen; wasserreiches Gemüse bei Bedarf vorbereiten. Eine schwere, nasse Mitte erschwert das Einschießen und kann länger weich bleiben.",
      ),
      section(
        "zeitpunkt",
        "Zügig belegen und einschießen",
        "Belege erst, wenn Ofen und Schaufel bereit sind. Lange Standzeit lässt Feuchtigkeit in den Boden ziehen und erhöht die Klebegefahr. Empfindliche Blätter passen oft besser nach dem Backen auf die Pizza. Der kurze Pizzabackgang ersetzt kein gezieltes Vorgaren von Zutaten, die das benötigen.",
      ),
    ],
  },
  {
    id: "oefen",
    title: "Pizzaofen, Haushaltsofen & Grill",
    category: "Backen",
    summary: "Unterhitze und Oberhitze ins Gleichgewicht bringen.",
    tags: ["Pizzaofen", "Haushaltsbackofen", "Grill", "Stein", "Stahl"],
    sourceIds: ["oven", "ny"],
    sections: [
      section(
        "geraete",
        "Jedes Gerät backt anders",
        "Im Pizzaofen treffen starke Oberhitze und ein heißer Boden zusammen. Im Haushaltsofen kann ein vorgeheizter Stein oder Stahl die Unterseite unterstützen. Ein Grill mit Pizzastein braucht auch ausreichende Hitze über der Pizza; eine starke Flamme von unten allein kann den Boden verbrennen.",
      ),
      section(
        "vorheizen",
        "Die Backfläche braucht Zeit",
        "Die Anzeige des Geräts sagt nicht, dass der Stein bereits durchgewärmt ist. Plane Vorheizen und Erholung zwischen den Pizzen ein. Nutze nur für Gerät und Temperatur zugelassenes Zubehör und halte dich an dessen Anleitung. Geräteeinstellungen sind nicht mit gemessener Steintemperatur gleichzusetzen.",
      ),
    ],
  },
  {
    id: "backtemperatur",
    title: "Temperatur, Zeit & Drehpunkt",
    category: "Backen",
    summary: "Richtwerte an Stil, Backfläche und Bräunung anpassen.",
    tags: ["Backzeit", "Steintemperatur", "Oberhitze", "Drehen"],
    sourceIds: ["avpn", "oven"],
    sections: [
      section(
        "richtwerte",
        "Ein Startpunkt, keine Garantie",
        "Als Referenz nennt die AVPN für klassische neapolitanische Pizza ungefähr 380–430 °C an der Backfläche und 60–90 Sekunden Backzeit. Das sind stil- und ofenspezifische Werte, keine Vorgabe für den Haushaltsofen. Dort braucht Pizza bei niedrigerer verfügbarer Temperatur entsprechend länger; Dicke und Belag wirken mit.",
      ),
      section(
        "beobachten",
        "Oberseite und Boden prüfen",
        "Drehe erst, wenn der Boden tragfähig ist und sich lösen lässt. Bei ungleichmäßiger Hitze öfter kontrollieren. Ist oben schon alles dunkel, unten aber weich, prüfe Vorheizen, Belag und die Balance der Hitze. Ein Timer erinnert – fertig ist die Pizza nach sichtbarem Backzustand, nicht nur nach Ablauf.",
      ),
    ],
  },
  {
    id: "pizzastile",
    title: "Pizzastile bewusst wählen",
    category: "Backen",
    summary: "Stil ist mehr als ein Hydrationswert.",
    tags: ["Neapolitanisch", "New York", "Römisch", "Tonda", "Teglia"],
    sourceIds: ["avpn", "ny"],
    sections: [
      section(
        "klassiker",
        "Neapel und New York",
        "Klassische neapolitanische Pizza hat einen weichen, luftigen Rand und wird kurz und heiß gebacken. New York verbindet einen dünnen, faltbaren Boden mit stärkerer Bräunung und längerem Backen. Öl und gegebenenfalls Zucker können zur jeweiligen Rezeptur gehören; bei großer Hitze fördern sie zu schnelle Bräunung.",
      ),
      section(
        "roemisch",
        "Römisch ist nicht eindeutig",
        "Römische Tonda ist rund, dünn und eher knusprig; Pizza in Teglia wird im Blech gebacken und kann deutlich weicher und wasserreicher angesetzt werden. Der Ciao!-Startwert „Römisch“ ist deshalb kein Universalrezept für jede römische Variante. Nutze einen eigenen Stil, wenn dein Ziel von den Startwerten abweicht.",
      ),
    ],
  },
  {
    id: "fehler",
    title: "Typische Fehler eingrenzen",
    category: "Handwerk",
    summary: "Beobachten, eine Ursache prüfen, gezielt verändern.",
    tags: [
      "klebrig",
      "trocken",
      "reißt",
      "Untergare",
      "Übergare",
      "dunkel",
      "hell",
    ],
    sourceIds: ["shape", "knead", "oven"],
    sections: [
      section(
        "teig",
        "Klebrig, fest oder instabil?",
        "Klebrigkeit kann zu hoher Wasserzugabe, Wärme oder fehlender Struktur entsprechen. Erst Temperatur, Ruhe und Rezept prüfen, bevor du viel Mehl zugibst. Bei trockenem Teig auch Abdeckung und Wiegefehler prüfen. Rückzug beim Formen spricht oft für fehlende Entspannung; Reißen kann dagegen schwache Struktur oder zu lange Gare anzeigen.",
      ),
      section(
        "backen",
        "Blass, dunkel oder unten noch weich?",
        "Unterscheide Boden und Oberseite. Prüfe vorgeheizte Backfläche, Hitzeverteilung, Teigdicke, loses Mehl sowie Öl und Zucker. Verändere beim nächsten Versuch möglichst nur eine Größe und dokumentiere das Ergebnis. Im Teig-Doc werden vorhandene Plandaten mit nachvollziehbaren Regeln berücksichtigt; auch dort sind Ursachen Möglichkeiten und keine sichere Diagnose.",
      ),
    ],
  },
];
const normalize = (text: string) =>
  text
    .toLocaleLowerCase("de")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss");
export function searchArticles(query: string, category?: Category): Article[] {
  const words = normalize(query.trim()).split(/\s+/).filter(Boolean);
  return articles.filter(
    (a) =>
      (!category || a.category === category) &&
      words.every((word) =>
        normalize(
          [
            a.title,
            a.summary,
            ...a.tags,
            ...a.sections.flatMap((s) => [s.title, ...s.paragraphs]),
          ].join(" "),
        ).includes(word),
      ),
  );
}
/** Pure lookup only: no model calls, ranking engine, user data, or network side effects. */
export function getArticleSection(articleId: string, sectionId: string) {
  const article = articles.find((a) => a.id === articleId);
  const section = article?.sections.find((s) => s.id === sectionId);
  return article && section
    ? {
        contentVersion,
        articleId,
        articleTitle: article.title,
        sectionId,
        title: section.title,
        paragraphs: section.paragraphs,
        sourceIds: article.sourceIds,
      }
    : undefined;
}
