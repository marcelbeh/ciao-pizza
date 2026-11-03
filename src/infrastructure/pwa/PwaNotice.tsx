import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Icon } from "../../components/Icon";
interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
export function PwaNotice() {
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
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    const onInstalled = () => {
      setInstall(null);
      setHelpOpen(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
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
  return (
    <div className="pwa-area">
      <button className="install-link" onClick={() => void installApp()}>
        <Icon name="download" /> App installieren
      </button>
      {helpOpen && (
        <div className="pwa-toast">
          <p>
            Auf dem iPhone: Öffne Ciao! in Safari, tippe auf „Teilen“ und dann
            auf „Zum Home-Bildschirm“. In anderen Browsern findest du die
            Installation im Browser-Menü, sofern unterstützt.
          </p>
          <button onClick={() => setHelpOpen(false)}>Schließen</button>
        </div>
      )}
      {needRefresh && (
        <div className="pwa-toast" role="status">
          <p>Eine neue Version von Ciao! ist bereit.</p>
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
  );
}
