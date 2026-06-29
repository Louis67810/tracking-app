import { ArrowRightIcon } from "@heroicons/react/24/outline";
import ScoreRing from "../ui/ScoreRing.jsx";

const mainScore = 90;
const workLinks = ["Calendrier", "Tes tâches", "Tes objectifs"];

export default function WorkPage() {
  return (
    <section className="work-page page-surface">
      <div className="hero-art" aria-hidden="true">
        <div className="stair-light" />
      </div>

      <header className="top-row">
        <div className="avatar" aria-label="Profil" />
        <ScoreRing score={mainScore} />
      </header>

      <div className="divider divider-top" />

      <h1>Travail</h1>

      <div className="divider divider-title" />

      <div className="work-cards" aria-label="Sections travail">
        {workLinks.map((label) => (
          <button className="work-card" type="button" key={label}>
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
    </section>
  );
}
