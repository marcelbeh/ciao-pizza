import { assertDiagnostic } from "./validation";
import { assertPlan } from "../dough/calculations";
import {
  problems,
  type DiagnosticInput,
  type Diagnosis,
  type DiagnosisEngine,
  type Finding,
} from "./model";
const base: Record<keyof typeof problems, Omit<Finding, "id" | "evidence">> = {
  sticky: {
    cause: "Viel freies Wasser, wenig Teigstabilität oder zu viel Reife",
    now: "Mit Teigkarte und leicht bemehlten Händen arbeiten. Nicht unkontrolliert Mehl einkneten; bei wenig Struktur eine kurze abgedeckte Pause einlegen.",
    next: "Mehlwasseraufnahme prüfen und Hydration beim nächsten Versuch in kleinen Schritten senken; Reife und Knetung getrennt vergleichen.",
    parameter:
      "Hydration ist Wasser relativ zur Mehlmasse; die verträgliche Menge hängt vom Mehl ab.",
  },
  dry: {
    cause: "Zu wenig Wasser oder eine ausgetrocknete Oberfläche",
    now: "Teig abdecken. In der frühen Mischphase kleine abgewogene Wassermengen einarbeiten; einen fertig gereiften Teig nicht kräftig nachkneten.",
    next: "Wasser und Mehl wiegen, zusätzliches Arbeitsmehl dokumentieren und die Teigbox schließen.",
    parameter:
      "Niedrige Hydration und Verdunstung machen den Teig fester; viel Streumehl verändert die Rezeptur.",
  },
  shrinking: {
    cause: "Gespanntes Gluten oder noch kalter Teig",
    now: "Abgedeckt etwa 15 Minuten entspannen lassen, dann vorsichtig von der Mitte aus öffnen. Nicht gewaltsam ziehen.",
    next: "Mehr Entspannungszeit nach dem Rundwirken einplanen und kalte Teiglinge vor dem Formen temperieren.",
    parameter:
      "Kneten und Rundwirken spannen das Glutengerüst; Zeit kann die Dehnbarkeit verbessern.",
  },
  tearing: {
    cause:
      "Zu dünne Stellen, schwaches Glutengerüst oder zu weit gereifter Teig",
    now: "Langsam und gleichmäßig öffnen. Kleine Löcher zusammendrücken; sehr schwachen Teig vorsichtig auf einem geeigneten Blech verarbeiten.",
    next: "Knetentwicklung, Mehlstärke und Reife getrennt überprüfen; den Teig nicht an wenigen Punkten ziehen.",
    parameter:
      "Hydration, Mehlprofil und Reife beeinflussen die tragfähige Glutenstruktur.",
  },
  noRise: {
    cause: "Wenig Hefeaktivität, niedrige Temperatur oder zu kurze Reife",
    now: "Teigtemperatur prüfen und abgedeckt moderat temperieren. Mehr Zeit geben und die Entwicklung beobachten; nicht stark erhitzen.",
    next: "Frische und Typ der Hefe, Waage und Wassertemperatur prüfen; tatsächliche Teigtemperatur notieren.",
    parameter:
      "Gärzeit allein beweist keine Reife. Hefeart und Temperatur beeinflussen die Aktivität.",
  },
  overproof: {
    cause:
      "Die Teigstruktur könnte durch lange oder warme Reife geschwächt sein",
    now: "Wenn der Teig noch formbar ist, behutsam und zeitnah verarbeiten. Stark zerfließenden Teig eher auf einem Blech backen; zusätzliche Gare vermeiden.",
    next: "Zeit, Temperatur oder Hefemenge einzeln reduzieren und die Struktur beobachten.",
    parameter:
      "Ein kollabierter Teig ist ein stärkeres Indiz als die bloße Anzahl der Gärstunden.",
  },
  underproof: {
    cause:
      "Der Teig könnte noch nicht ausreichend entwickelt oder temperiert sein",
    now: "Abgedeckt mehr Zeit geben und Temperatur, Volumen und Elastizität beobachten. Noch kalten Teig nicht mit Gewalt ausformen.",
    next: "Den Ansatz früher beginnen; tatsächliche Raum- und Teigtemperaturen statt nur der Sollwerte dokumentieren.",
    parameter:
      "Hefemenge, Mehlstärke, Temperatur und Zeit wirken zusammen; ein Fingertest allein ist kein sicherer Nachweis.",
  },
  dark: {
    cause:
      "Zu starke lokale Hitze, zu lange Backzeit oder schnell bräunende Zutaten",
    now: "Pizza früher drehen bzw. herausnehmen, Ober- und Unterseite getrennt prüfen. Hitze am Gerät anpassen; verbranntes Streumehl entfernen, sobald das sicher möglich ist.",
    next: "Stein- und Oberhitze getrennt messen, Zucker und Arbeitsmehl prüfen. Erst einen Parameter ändern.",
    parameter:
      "Zucker, Öl, Backzeit und direkte Strahlung beeinflussen die Bräunung.",
  },
  pale: {
    cause: "Zu wenig Wärme am Teig oder eine zu kurze Backzeit",
    now: "Nach Sicht etwas länger backen und Stein sowie Oberhitze prüfen. Nicht blind die maximale Temperatur wählen.",
    next: "Länger vorheizen, Belagmenge begrenzen und Einschub bzw. Oberhitze prüfen; Rezept und Gare mitprotokollieren.",
    parameter:
      "Die Ofenanzeige entspricht nicht automatisch der Steintemperatur.",
  },
  soggy: {
    cause:
      "Zu wenig gespeicherte Unterhitze, dicke Mitte oder sehr feuchter Belag",
    now: "Boden anheben und prüfen. Wenn die Oberseite schon fertig ist, die direkte Oberhitze reduzieren und den Boden kontrolliert weiterbacken.",
    next: "Stein länger vorheizen, feuchte Zutaten abtropfen lassen und die Mitte gleichmäßig dünn öffnen.",
    parameter:
      "Steintemperatur und Belagfeuchte bestimmen den Wärmeeintrag in die Mitte; die Lufttemperatur genügt als Messwert nicht.",
  },
};
export function diagnose(input: DiagnosticInput): Diagnosis {
  assertDiagnostic(input);
  assertPlan(input.plan);
  if (!Object.hasOwn(problems, input.problem))
    throw Error("Bitte ein bekanntes Problem auswählen.");
  const p = input.plan,
    a = input.actual;
  const evidence = `Plan: ${p.hydration} % Wasser, ${p.flourProfile}; ${p.method === "cold" ? "kalte" : "direkte"} Führung, Stock ${a.bulkHours ?? p.bulkHours} h, Stück ${a.ballHours ?? p.ballHours} h${p.method === "cold" ? `, kalt ${a.coldHours ?? p.coldHours} h bei ${a.fridgeC ?? p.fridgeC} °C` : ""}; Raum ${a.roomC ?? p.roomC} °C, Teig ${a.doughC ?? p.doughC} °C. Nicht gemessene Werte stammen aus dem Plan.`;
  const findings: Finding[] = [
    { id: `base:${input.problem}`, ...base[input.problem], evidence },
  ];
  const add = (
    id: string,
    cause: string,
    evidence: string,
    now: string,
    next: string,
    parameter: string,
  ) => findings.push({ id, cause, evidence, now, next, parameter });
  if (["sticky", "tearing"].includes(input.problem) && p.hydration >= 70)
    add(
      "high-water",
      "Hohe Hydration als zusätzlicher Einfluss",
      `${p.hydration} % liegt über der redaktionellen Prüfschwelle von 70 %; das ist kein Beweis für einen Fehler.`,
      "Teig stützen statt ziehen; nur sparsam mit Arbeitsmehl arbeiten.",
      "Beim Vergleich das gleiche Mehl verwenden und Wasser schrittweise anpassen.",
      "Mehlstärke lässt sich aus dem Profilnamen nicht zuverlässig bestimmen.",
    );
  if (
    ["shrinking", "noRise", "underproof"].includes(input.problem) &&
    (input.temperature === "cold" || (a.doughC ?? p.doughC) < 20)
  )
    add(
      "cold",
      "Kalter Teig kann die Entwicklung bremsen",
      input.temperature === "cold"
        ? "Du hast „noch kalt“ angegeben."
        : `Teigtemperatur ${a.doughC ?? p.doughC} °C unter der Prüfschwelle 20 °C.`,
      "Abgedeckt moderat temperieren und Entwicklung beobachten.",
      "Temperierzeit in den Ablauf aufnehmen.",
      "20 °C ist ein Prüfhinweis, kein universeller Reifegrenzwert.",
    );
  if (
    ["shrinking", "tearing"].includes(input.problem) &&
    input.rest === "short"
  )
    add(
      "rest",
      "Zu kurze Entspannung nach dem Rundwirken",
      "Du hast wenig Entspannungszeit angegeben.",
      "Abgedeckt entspannen lassen, erneut vorsichtig öffnen.",
      "Eine Ruhephase vor dem Formen einplanen.",
      "Entspannung ist nicht gleich zusätzliche Hefemenge.",
    );
  const warm = (a.roomC ?? p.roomC) >= 26 || input.temperature === "warm";
  const long =
    (a.bulkHours ?? p.bulkHours) + (a.ballHours ?? p.ballHours) > 16 ||
    input.rest === "long";
  if (
    ["sticky", "tearing", "overproof"].includes(input.problem) &&
    (warm || long || input.rise === "collapsed")
  )
    add(
      "structure",
      "Wärme oder lange Reife könnten Strukturverlust verstärken",
      `Hinweise: ${warm ? "warm; " : ""}${long ? "lange Raumphase; " : ""}${input.rise === "collapsed" ? "Teig kollabiert" : ""}`,
      "Behutsam verarbeiten und nicht unnötig weiterreifen lassen.",
      "Nur einen der Faktoren Zeit, Wärme oder Hefe verändern.",
      "26 °C und 16 h sind redaktionelle Prüfschwellen, keine Gärprognose.",
    );
  if (["noRise", "underproof"].includes(input.problem) && input.rise === "none")
    add(
      "activity",
      "Beobachtete fehlende Volumenzunahme",
      "Du hast keine erkennbare Zunahme angegeben.",
      "Temperatur und Hefe prüfen, dann weiter beobachten.",
      "Hefe separat auf Aktivität prüfen und korrekt abwiegen.",
      "Frischhefe und Instanthefe nicht 1:1 austauschen; der P1-Rechner berücksichtigt den Typ.",
    );
  if (input.problem === "dark" && (p.sugar > 0 || p.oil > 0))
    add(
      "browning",
      "Die Rezeptur enthält bräunungsfördernde Zutaten",
      `${p.sugar} % Zucker, ${p.oil} % Öl. Besonders bei hoher Hitze prüfen.`,
      "Backzeit und direkte Hitze reduzieren, nach Sicht prüfen.",
      "Rezept an das Gerät anpassen; Zucker bei sehr heißem Kurzbacken hinterfragen.",
      "Kein automatisches Umschreiben deiner Rezeptur.",
    );
  if (["dark", "pale", "soggy"].includes(input.problem))
    add(
      "heat-balance",
      input.browning === "bottom"
        ? "Unterseite gezielt beurteilen"
        : input.browning === "top"
          ? "Oberseite gezielt beurteilen"
          : "Ober- und Unterhitze getrennt beurteilen",
      `Gerät ${p.oven}; ${a.ovenC === null ? "geplant" : "gemessen"} ${a.ovenC ?? p.ovenC} °C, Stein ${a.stoneC === null ? "nicht gemessen" : a.stoneC + " °C"}, Backdauer ${a.bakeSeconds === null ? "nicht gemessen" : a.bakeSeconds + " s"}.`,
      "Pizza anheben und beide Seiten ansehen; Hitze und Restbackzeit danach wählen.",
      "Steintemperatur vor jeder Pizza notieren und Erholungszeit vergleichen.",
      "Aus fehlenden Messwerten wird kein Temperaturdefizit abgeleitet.",
    );
  return {
    engine: "rules-v1",
    findings,
    note: "Regelbasierte Orientierung, keine sichere Diagnose. Beobachtungen und Messwerte fehlen teilweise. Bei Weizen-Pizzateigen anwendbar; keine Reife- oder Erfolgsprognose.",
  };
}
export const localDiagnosisEngine: DiagnosisEngine = {
  analyze: async (input) => diagnose(input),
};
