export default function ScoreRing({ score }) {
  const normalized = Math.max(0, Math.min(100, Number(score) || 0));
  const radius = 23.5;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - normalized / 100);

  return (
    <div className="score-ring" aria-label={`Score ${normalized}`}>
      <svg className="score-ring-svg" viewBox="0 0 50 50" aria-hidden="true">
        <defs>
          <linearGradient id="scoreStroke" x1="6" y1="42" x2="44" y2="8" gradientUnits="userSpaceOnUse">
            <stop stopColor="#007CEF" />
            <stop offset="1" stopColor="#8DC4E1" />
          </linearGradient>
        </defs>
        <circle className="score-track" cx="25" cy="25" r={radius} />
        <circle
          className="score-progress"
          cx="25"
          cy="25"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="score-value">
        <span>{normalized}</span>
        <img src="/assets/score-triangle.svg" alt="" aria-hidden="true" />
      </div>
    </div>
  );
}
