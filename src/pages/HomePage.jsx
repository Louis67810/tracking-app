import { ChevronLeftIcon, ChevronRightIcon, TagIcon } from "@heroicons/react/24/solid";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ScoreRing from "../ui/ScoreRing.jsx";

const mainScore = 90;

const scorePills = [
  { label: "Dormir", value: 50 },
  { label: "Focus", value: 50 },
  { label: "Santé", value: 50 },
  { label: "Tâche", value: 50 }
];

const nfcCards = [
  { title: "Sommeil", meta: "Routine du soir" },
  { title: "Focus", meta: "Session profonde" },
  { title: "Hydratation", meta: "Suivi eau" }
];

const homeLinks = [
  { label: "Tes tâches", to: "/travail/taches" },
  { label: "Tes objectifs", to: "/travail/objectifs" }
];

const heatmapDots = Array.from({ length: 27 * 14 }, (_, index) => {
  const column = index % 27;
  const row = Math.floor(index / 27);
  const activeBand = row >= 7 && row <= 10 && column % 5 !== 1;
  const strongBand = activeBand && (column === 6 || column === 14 || column === 22);
  return { id: index, level: strongBand ? 3 : activeBand ? 2 : (column + row) % 11 === 0 ? 1 : 0 };
});

function formatDay(offset) {
  if (offset === 0) return "Aujourd'hui";
  if (offset === -1) return "Hier";
  if (offset === 1) return "Demain";

  const formatter = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return formatter.format(date).replace(".", "");
}

export default function HomePage() {
  const navigate = useNavigate();
  const [dayOffset, setDayOffset] = useState(0);

  return (
    <section className="home-page page-surface" aria-label="Accueil">
      <div className="home-hero-art" aria-hidden="true" />
      <div className="home-orb home-orb-left" aria-hidden="true" />
      <div className="home-orb home-orb-right" aria-hidden="true" />

      <header className="top-row home-top-row">
        <div className="avatar" aria-label="Profil" />
        <div className="day-switcher home-day-switcher" aria-label="Navigation des jours">
          <button type="button" aria-label="Jour precedent" onClick={() => setDayOffset((value) => value - 1)}>
            <ChevronLeftIcon width={24} height={24} />
          </button>
          <div className="day-pill">{formatDay(dayOffset)}</div>
          <button type="button" aria-label="Jour suivant" onClick={() => setDayOffset((value) => value + 1)}>
            <ChevronRightIcon width={24} height={24} />
          </button>
        </div>
        <ScoreRing score={mainScore} />
      </header>

      <section className="home-score-panel" aria-label="Score du jour">
        <span>Score</span>
        <strong>
          {mainScore}
          <i />
        </strong>
      </section>

      <div className="home-score-branches" aria-hidden="true" />

      <div className="home-score-pills">
        {scorePills.map((pill) => (
          <div className="home-score-pill" key={pill.label}>
            <b>
              <TagIcon width={16} height={16} />
              {pill.value}
            </b>
            <span>{pill.label}</span>
          </div>
        ))}
      </div>

      <div className="home-work-cards" aria-label="Sections rapides">
        {homeLinks.map(({ label, to }) => (
          <button className="work-card" type="button" key={label} onClick={() => navigate(to)}>
            <span className="card-label">
              {label}
              <span className="arrow-disc" aria-hidden="true">
                <ArrowRightIcon width={15.5} height={15.5} strokeWidth={2.2} />
              </span>
            </span>
            <span className="card-light" aria-hidden="true" />
          </button>
        ))}
      </div>

      <section className="home-heatmap-card">
        <header>
          <span>Temps d'écran moyen</span>
          <button type="button">Last week</button>
        </header>
        <div className="home-heatmap-body">
          <div className="home-heatmap-scale">
            <span>6h</span>
            <span>5h</span>
            <span>4h</span>
            <span>3h</span>
            <span>2h</span>
            <span>1h</span>
          </div>
          <div>
            <div className="home-heatmap-grid">
              {heatmapDots.map((dot) => (
                <span className={`home-heatmap-dot level-${dot.level}`} key={dot.id} />
              ))}
            </div>
            <div className="home-heatmap-dates">
              <span>Jan 1</span>
              <span>Jun 07</span>
            </div>
          </div>
        </div>
      </section>

      <div className="home-dashboard-divider" />

      <h1 className="home-nfc-title">Tes puces NFC</h1>
      <div className="home-nfc-list">
        {nfcCards.map((card) => (
          <article className="home-nfc-card" key={card.title}>
            <TagIcon width={22} height={22} />
            <span>
              <strong>{card.title}</strong>
              <small>{card.meta}</small>
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
