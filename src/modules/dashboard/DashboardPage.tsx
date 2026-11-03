import { Link } from "react-router-dom";
import { ModuleCard } from "../../components/ModuleCard";
import { Icon } from "../../components/Icon";
import { modules } from "../registry";
export default function DashboardPage() {
  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">LA DOLCE PIZZA · CIAO! 2.0</p>
        <h1>
          Ein guter Tag für <em>Pizza.</em>
        </h1>
        <p>Dein Handwerk. Deine Leidenschaft. Dein Ciao!</p>
      </div>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="hero-label">PASSIONE, UN PASSO ALLA VOLTA</span>
          <h2 id="hero-title">
            Große Pizza.
            <br />
            Beginnt bei dir.
          </h2>
          <p>
            Ein Ort für deine Ideen, dein Wissen und die Freude am Selbermachen.
            Deine neue Pizza-Werkstatt nimmt Form an.
          </p>
          <Link className="button button-cream" to="/pizza-pilot">
            Pizza-Pilot entdecken <Icon name="arrow" />
          </Link>
          <span className="hero-note">
            Mit Liebe zum Detail. Von Anfang an.
          </span>
        </div>
        <div className="pizza-art" aria-hidden="true">
          <div className="art-ring ring-one" />
          <div className="art-ring ring-two" />
          <span className="art-caption">
            FATTO CON
            <br />
            <i>amore</i>
          </span>
          <svg viewBox="0 0 360 360">
            <defs>
              <radialGradient id="crust">
                <stop stopColor="#e4b45d" />
                <stop offset=".86" stopColor="#edc17c" />
                <stop offset="1" stopColor="#ad6b32" />
              </radialGradient>
            </defs>
            <circle cx="180" cy="180" r="141" fill="url(#crust)" />
            <circle cx="180" cy="180" r="124" fill="#b93225" />
            <path
              d="M78 143Q93 78 158 71q69-7 101 53t24 87q-16 66-85 78T83 236q-32-40-5-93"
              fill="#f4e5b5"
            />
            {[
              [110, 123],
              [232, 139],
              [158, 239],
              [245, 227],
              [169, 99],
              [105, 203],
            ].map(([cx, cy], i) => (
              <g key={i}>
                <circle cx={cx} cy={cy} r="21" fill="#c6422f" />
                <circle cx={cx} cy={cy} r="13" fill="#df6948" />
                <path
                  d={`M${cx - 5} ${cy - 6}l8 13m-12-3 15-7`}
                  stroke="#ec9c60"
                  strokeWidth="2"
                />
              </g>
            ))}
            {[
              [168, 151, 20],
              [221, 191, -35],
              [119, 258, 55],
              [104, 165, -25],
              [210, 90, 55],
            ].map(([x, y, r], i) => (
              <path
                key={i}
                d="M0 0Q-25-30 2-45 28-22 0 0Z"
                fill="#2b632e"
                transform={`translate(${x} ${y}) rotate(${r})`}
              />
            ))}
            <g fill="#855326" opacity=".65">
              <circle cx="95" cy="81" r="5" />
              <circle cx="270" cy="96" r="4" />
              <circle cx="310" cy="183" r="5" />
              <circle cx="258" cy="285" r="6" />
              <circle cx="71" cy="244" r="5" />
              <circle cx="166" cy="45" r="4" />
              <circle cx="128" cy="306" r="4" />
            </g>
          </svg>
        </div>
      </section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">DEINE PIZZA-WERKSTATT</p>
          <h2>Alles an seinem Platz.</h2>
        </div>
        <span className="phase-badge">P0 · Das Fundament</span>
      </div>
      <div className="module-grid">
        {modules.slice(1).map((module, index) => (
          <ModuleCard key={module.id} module={module} index={index + 1} />
        ))}
      </div>
      <aside className="closing-note">
        <span className="italian-mark">Ciao!</span>
        <div>
          <h2>Gutes braucht einen guten Anfang.</h2>
          <p>
            Dies ist das neue Zuhause deiner Pizza-Leidenschaft. Die Werkzeuge
            folgen Schritt für Schritt.
          </p>
        </div>
      </aside>
    </>
  );
}
