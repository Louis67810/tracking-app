export default function ScoreRing({ score }) {
  const normalized = Math.max(0, Math.min(100, Number(score) || 0));
  const angle = `${normalized * 3.6}deg`;

  return (
    <div className="score-ring" style={{ "--score-angle": angle }} aria-label={`Score ${normalized}`}>
      <div className="score-value">
        <span>{normalized}</span>
        <img src="/assets/score-triangle.svg" alt="" aria-hidden="true" />
      </div>
    </div>
  );
}
