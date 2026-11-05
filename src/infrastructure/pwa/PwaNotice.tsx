import { useRegisterSW } from "virtual:pwa-register/react";
export function PwaNotice({ busy }: { busy: boolean }) {
  const { needRefresh: [ready, setReady], offlineReady: [offline], updateServiceWorker } = useRegisterSW();
  return <div className="pwa-notice">
    {offline && <span className="offline-badge">Offline bereit</span>}
    {ready && <aside className="card" role="status"><p>Eine Aktualisierung ist verfügbar.</p>
      <p className="muted">Gültige Eingaben werden automatisch gespeichert. Unvollständige Eingaben vor dem Update abschließen.</p>
      <button disabled={busy} onClick={() => void updateServiceWorker(true)}>Jetzt aktualisieren</button>
      <button className="quiet" onClick={() => setReady(false)}>Später</button>
    </aside>}
  </div>;
}
