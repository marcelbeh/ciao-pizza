import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDough } from "../../app/DoughProvider";
import { modules } from "../registry";
import { ModuleCard } from "../../components/ModuleCard";
import { Icon } from "../../components/Icon";
import { dashboardStatus, timeUntil } from "../../core/dough/dashboardStatus";
import { calculateDough, formatGrams } from "../../core/dough/calculations";
import { styles } from "../../core/dough/model";
const order = [
  "pizza-pilot",
  "teigstudio",
  "reife-monitor",
  "rezeptbibliothek",
  "pizzaabend-planer",
  "backcoach",
  "teig-doc",
  "pizza-tagebuch",
  "einkaufsliste",
];
export default function DashboardPage() {
  const dough = useDough();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!dough.state.active) return;
    const tick = setInterval(() => {
      if (!document.hidden) setNow(Date.now());
    }, 60000);
    const update = () => setNow(Date.now());
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", update);
    };
  }, [!!dough.state.active]);
  const plan = dough.state.active;
  const status = plan ? dashboardStatus(plan, now) : null;
  const result = plan ? calculateDough(plan) : null;
  return (
    <div className="dashboard">
      <section className="welcome-hero" aria-labelledby="welcome-title">
        <picture>
          <source
            media="(max-width: 640px)"
            srcSet={`${import.meta.env.BASE_URL}brand/dough-hero-small.webp`}
          />
          <img
            src={`${import.meta.env.BASE_URL}brand/dough-hero.webp`}
            width={1200}
            height={720}
            fetchPriority="high"
            alt="Frischer, bemehlter Pizzateig auf einer warmen Arbeitsfläche"
          />
        </picture>
        <div className="welcome-copy">
          <p className="hero-kicker">LA TUA PIZZA. LA TUA PASSIONE.</p>
          <h1 id="welcome-title">Benvenuto!</h1>
          <p>Planen · Kneten · Reifen · Backen</p>
          <span className="italian-stripe" aria-hidden="true" />
        </div>
      </section>
      <div className="dashboard-content">
        <section className="active-dough" aria-labelledby="active-title">
          <div className="active-dough-top">
            <div className="dough-portrait" aria-hidden="true">
              <img
                src={`${import.meta.env.BASE_URL}brand/dough-hero-small.webp`}
                width={64}
                height={64}
              />
            </div>
            <div className="active-dough-copy">
              <p className="eyebrow">DEIN NÄCHSTER PIZZA-MOMENT</p>
              <h2 id="active-title">Aktiver Teig</h2>
              {!dough.ready ? (
                <p role="status">Teigplan wird geladen …</p>
              ) : plan && status && result ? (
                <>
                  <p className="active-plan-name">{plan.name}</p>
                  <p>
                    {styles[plan.style].name} · {plan.count} Pizzen ·{" "}
                    {formatGrams(result.ballGrams)} g
                  </p>
                </>
              ) : (
                <p>Hier beginnt dein nächster Pizzaabend.</p>
              )}
            </div>
          </div>
          {dough.error && (
            <p role="alert" className="dashboard-error">
              {dough.error}
            </p>
          )}
          {dough.ready && plan && status ? (
            <>
              <div className="ripeness">
                <div>
                  <span>
                    Reifung nach Plan <small>· Schätzung</small>
                  </span>
                  <strong>{status.progress} %</strong>
                </div>
                <progress
                  aria-label="Geschätzter zeitlicher Reifefortschritt"
                  max={100}
                  value={status.progress}
                />
              </div>
              <Link className="next-step" to="/teigstudio">
                <Icon name="clock" />
                <span>
                  {status.expired ? (
                    <>
                      <strong>Backtermin erreicht</strong>
                      <small>Termin und Teigzustand prüfen</small>
                    </>
                  ) : status.next ? (
                    <>
                      <strong>Noch {timeUntil(status.next.at - now)}</strong>
                      <small>
                        bis {status.next.label} ·{" "}
                        {new Intl.DateTimeFormat("de-DE", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                          timeZone: plan.timeZone,
                        }).format(new Date(status.next.at))}
                      </small>
                    </>
                  ) : (
                    <strong>Teigplan ansehen</strong>
                  )}
                </span>
                <Icon name="chevron" />
              </Link>
              <p className="schedule-caption">
                Zeitfortschritt aus deiner Planung – keine Messung der
                Teigreife.
              </p>
            </>
          ) : (
            dough.ready && (
              <div className="first-plan">
                <p>
                  Plane deinen Teig. Ciao! behält Mengen und nächste Schritte
                  für dich im Blick.
                </p>
                <Link className="button" to="/pizza-pilot">
                  Ersten Teig planen <Icon name="arrow" />
                </Link>
              </div>
            )
          )}
        </section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">MIT GEFÜHL. MIT CIAO!</p>
            <h2>Deine Pizza-Werkstatt</h2>
          </div>
        </div>
        <div className="module-grid">
          {order.map((id, index) => {
            const module = modules.find((m) => m.id === id)!;
            return <ModuleCard key={id} module={module} index={index + 1} />;
          })}
        </div>
        <aside className="academy-note">
          <Icon name="academy" />
          <div>
            <strong>Gutes Handwerk beginnt mit Wissen.</strong>
            <Link to="/pizza-academy">
              Zur Pizza-Academy <span>· In Vorbereitung</span>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
