import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Icon } from "../../components/Icon";
interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
export function PwaNotice() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [error, setError] = useState("");
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: () =>
      setError(
        "Offline-Modus derzeit nicht verfügbar. Du kannst Ciao! weiterhin online nutzen.",
      ),
  });
  useEffect(() => {
    setHost(document.getElementById("pwa-install-slot"));
    const query = window.matchMedia?.("(display-mode: standalone)");
    const update = () =>
      setStandalone(
        !!query?.matches ||
          !!(navigator as Navigator & { standalone?: boolean }).standalone,
      );
    update();
    query?.addEventListener?.("change", update);
    return () => query?.removeEventListener?.("change", update);
  }, []);
  useEffect(() => {
    const prompt = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    const installed = () => {
      setInstall(null);
      setHelpOpen(false);
      setStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", prompt);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", prompt);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);
  async function installApp() {
    if (!install) {
      setHelpOpen(!helpOpen);
      return;
    }
    try {
      await install.prompt();
      await install.userChoice;
      setInstall(null);
    } catch {
      setError(
        "Installation nicht möglich. Versuche es über das Browser-Menü.",
      );
    }
  }
  const controls = (
    <>
      {!standalone && (
        <button className="install-link" onClick={() => void installApp()}>
          <Icon name="download" />
          App installieren
        </button>
      )}
      {helpOpen && (
        <div className="install-help">
          <p>
            Auf dem iPhone: Öffne Ciao! in Safari, tippe auf „Teilen“ und dann
            auf „Zum Home-Bildschirm“. In anderen Browsern findest du die
            Installation im Browser-Menü, sofern unterstützt.
          </p>
          <button onClick={() => setHelpOpen(false)}>Hinweis schließen</button>
        </div>
      )}
    </>
  );
  return (
    <>
      {host && createPortal(controls, host)}
      <div className="pwa-area">
        {needRefresh && (
          <div className="pwa-toast" role="status">
            <p>Eine neue Version von Ciao! ist bereit.</p>
            <small>
              Ungespeicherte Eingaben bitte zuerst speichern. Deine
              gespeicherten Daten bleiben erhalten.
            </small>
            <button
              onClick={() =>
                void updateServiceWorker(true).catch(() =>
                  setError(
                    "Aktualisierung fehlgeschlagen. Bitte lade die Seite erneut.",
                  ),
                )
              }
            >
              Jetzt aktualisieren
            </button>
            <button onClick={() => setNeedRefresh(false)}>Später</button>
          </div>
        )}
        {error && (
          <div className="pwa-toast" role="status">
            <p>{error}</p>
            <button onClick={() => setError("")}>Schließen</button>
          </div>
        )}
      </div>
    </>
  );
}
