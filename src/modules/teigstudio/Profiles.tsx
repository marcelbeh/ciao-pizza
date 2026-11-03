import { useState } from "react";
import { useDough } from "../../app/DoughProvider";
import { TextField } from "../../components/dough/Fields";
export function Profiles({ disabled = false }: { disabled?: boolean }) {
  const workspace = useDough();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  function action(fn: () => void, success: string) {
    try {
      fn();
      setMessage(success);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Aktion fehlgeschlagen.",
      );
    }
  }
  return (
    <section className="dough-panel profiles">
      <p className="eyebrow">DEINE SAMMLUNG</p>
      <h2>Eigene Teigprofile</h2>
      <p>
        Ein Profil bewahrt deine vollständige Rezeptur und Planung. Laden
        ersetzt den aktiven Plan; Änderungen daran verändern das Profil erst mit
        „Profil aktualisieren“.
      </p>
      <div className="form-grid">
        <div className="dough-field">
          <label htmlFor="profile-select">Gespeichertes Profil</label>
          <select
            id="profile-select"
            value={selected}
            onChange={(e) => {
              const id = e.target.value;
              setSelected(id);
              setName(
                workspace.state.profiles.find((p) => p.id === id)?.name ?? "",
              );
              setMessage("");
            }}
          >
            <option value="">Profil auswählen</option>
            {workspace.state.profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </div>
        <TextField label="Profilname" value={name} onChange={setName} />
      </div>
      <div className="dough-actions">
        <button
          type="button"
          className="button"
          disabled={disabled || !workspace.state.active || !name.trim()}
          onClick={() =>
            action(
              () => workspace.saveProfile(name),
              "Neues Profil übernommen.",
            )
          }
        >
          Als neues Profil speichern
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={!selected}
          onClick={() =>
            action(
              () => workspace.loadProfile(selected),
              "Profil als aktiven Plan geladen.",
            )
          }
        >
          Profil laden
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={
            disabled || !selected || !name.trim() || !workspace.state.active
          }
          onClick={() =>
            action(
              () => workspace.saveProfile(name, selected),
              "Profil aktualisiert.",
            )
          }
        >
          Profil aktualisieren
        </button>
        <button
          type="button"
          className="text-button danger"
          disabled={!selected}
          onClick={() =>
            action(() => {
              workspace.deleteProfile(selected);
              setSelected("");
              setName("");
            }, "Profil gelöscht. Der aktive Plan bleibt erhalten.")
          }
        >
          Profil löschen
        </button>
      </div>
      {message && (
        <p role="status">{message} Bitte den Speicherstatus oben beachten.</p>
      )}
      <p className="dough-fine">
        Bis zu 100 Profile auf diesem Gerät. Beim Löschen der Browserdaten gehen
        lokale Pläne verloren.
      </p>
    </section>
  );
}
