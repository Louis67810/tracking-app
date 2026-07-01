import { ArrowRightIcon, CheckIcon, MinusIcon, PlusIcon } from "@heroicons/react/24/solid";
import { useEffect, useMemo, useState } from "react";
import { useWorkData } from "../work/WorkDataContext.jsx";
import ScoreRing from "../ui/ScoreRing.jsx";

const mainScore = 90;

const moods = [
  { id: "rough", label: "Difficile", description: "Journee lourde", color: "#FF5A61" },
  { id: "tired", label: "Fatigue", description: "Energie basse", color: "#FF8B5B" },
  { id: "neutral", label: "Stable", description: "Rien de special", color: "#FFC957" },
  { id: "good", label: "Bien", description: "Bonne dynamique", color: "#93D95E" },
  { id: "great", label: "Excellent", description: "Tres bonne journee", color: "#4DC84A" }
];

const habits = [
  { id: "water", label: "Hydratation", question: "As-tu assez bu aujourd'hui ?", quantitative: true, unit: "L", min: 0, max: 6, step: 0.25 },
  { id: "screen", label: "Ecran", question: "As-tu limite ton temps d'ecran ?", quantitative: false },
  { id: "movement", label: "Mouvement", question: "As-tu bouge au moins 20 minutes ?", quantitative: false },
  { id: "planning", label: "Planification", question: "As-tu prepare demain ?", quantitative: false }
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export default function RecapPage() {
  const { tasks } = useWorkData();
  const [step, setStep] = useState(0);
  const [moodId, setMoodId] = useState(moods[2].id);
  const [answers, setAnswers] = useState(() =>
    Object.fromEntries(habits.map((habit) => [habit.id, { done: null, value: habit.quantitative ? 1.5 : null }]))
  );
  const [notes, setNotes] = useState("");
  const [savedRecap, setSavedRecap] = useState(null);
  const key = `daily-recap-${todayKey()}`;

  useEffect(() => {
    const stored = window.localStorage.getItem(key);
    if (stored) {
      setSavedRecap(JSON.parse(stored));
      setStep(3);
    }
  }, [key]);

  const mood = useMemo(() => moods.find((option) => option.id === moodId) ?? moods[2], [moodId]);
  const completedTasks = tasks.filter((task) => task.completed).length;
  const yesCount = Object.values(answers).filter((answer) => answer.done === true).length;
  const answeredCount = Object.values(answers).filter((answer) => answer.done !== null).length;

  function setHabitDone(habitId, done) {
    setAnswers((current) => ({ ...current, [habitId]: { ...current[habitId], done } }));
  }

  function adjustHabitValue(habit, delta) {
    setAnswers((current) => {
      const currentValue = Number(current[habit.id]?.value ?? 0);
      const nextValue = Math.max(habit.min, Math.min(habit.max, currentValue + delta));
      return { ...current, [habit.id]: { ...current[habit.id], value: nextValue } };
    });
  }

  function saveRecap() {
    const recap = {
      date: todayKey(),
      mood,
      habits: habits.map((habit) => ({ ...habit, answer: answers[habit.id] })),
      notes,
      stats: {
        completedTasks,
        totalTasks: tasks.length,
        habitsDone: yesCount,
        habitsTotal: habits.length
      }
    };
    window.localStorage.setItem(key, JSON.stringify(recap));
    setSavedRecap(recap);
    setStep(3);
  }

  const canContinue = step === 0 ? Boolean(moodId) : step === 1 ? answeredCount === habits.length : true;
  const finalRecap = savedRecap ?? { mood, habits: habits.map((habit) => ({ ...habit, answer: answers[habit.id] })) };

  return (
    <section className="recap-page page-surface">
      <div className="recap-orb" aria-hidden="true" />
      <header className="top-row recap-top-row">
        <div className="avatar" aria-label="Profil" />
        <ScoreRing score={mainScore} />
      </header>

      {step === 0 && (
        <div className="recap-step">
          <h1 className="recap-title">Ton humeur</h1>
          <div className="divider recap-divider" />
          <div className="mood-list">
            {moods.map((option) => (
              <button
                className={`mood-card ${moodId === option.id ? "is-selected" : ""}`}
                type="button"
                key={option.id}
                onClick={() => setMoodId(option.id)}
              >
                <span className="mood-color" style={{ background: option.color }} />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="recap-step">
          <h1 className="recap-title compact">Avez-vous fait cette habitude</h1>
          <div className="divider recap-divider compact" />
          <div className="habit-list">
            {habits.map((habit) => {
              const answer = answers[habit.id];
              return (
                <article className="habit-card" key={habit.id}>
                  <h2>{habit.question}</h2>
                  <div className="habit-choice-row">
                    <button className={`habit-choice no ${answer.done === false ? "is-selected" : ""}`} type="button" onClick={() => setHabitDone(habit.id, false)}>
                      Non
                    </button>
                    <button className={`habit-choice yes ${answer.done === true ? "is-selected" : ""}`} type="button" onClick={() => setHabitDone(habit.id, true)}>
                      Oui
                    </button>
                  </div>
                  {habit.quantitative && answer.done === true && (
                    <div className="habit-quantity">
                      <span>Combien de litres d'eau bus</span>
                      <div className="quantity-stepper" aria-label="Quantite">
                        <button type="button" onClick={() => adjustHabitValue(habit, -habit.step)}>
                          <MinusIcon width={12} height={12} />
                        </button>
                        <b>{formatNumber(answer.value)}</b>
                        <button type="button" onClick={() => adjustHabitValue(habit, habit.step)}>
                          <PlusIcon width={12} height={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="recap-step">
          <h1 className="recap-title compact">Récap</h1>
          <div className="divider recap-divider compact" />
          <div className="recap-summary">
            <div className="summary-mood">
              <span className="mood-color small" style={{ background: mood.color }} />
              <span>{mood.label}</span>
            </div>
            <div className="summary-list">
              <div className="summary-card">
                <CheckIcon width={22} height={22} />
                <span>{completedTasks} tâches terminées sur {tasks.length}</span>
              </div>
              <div className="summary-card">
                <CheckIcon width={22} height={22} />
                <span>{yesCount} habitudes validées sur {habits.length}</span>
              </div>
              {habits
                .filter((habit) => habit.quantitative && answers[habit.id].done)
                .map((habit) => (
                  <div className="summary-card" key={habit.id}>
                    <CheckIcon width={22} height={22} />
                    <span>{formatNumber(answers[habit.id].value)} {habit.unit} d'eau</span>
                  </div>
                ))}
            </div>
            <textarea
              className="recap-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ajoutez une note en plus ici"
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="recap-step recap-done">
          <h1 className="recap-title compact">Récap terminé</h1>
          <div className="divider recap-divider compact" />
          <div className="recap-done-card">
            <span className="mood-color" style={{ background: finalRecap.mood.color }} />
            <strong>{finalRecap.mood.label}</strong>
            <p>Ton récap du jour est enregistré. Tu pourras en refaire un demain.</p>
          </div>
        </div>
      )}

      {step < 3 && (
        <footer className="recap-actions">
          <button className="recap-continue" type="button" disabled={!canContinue} onClick={() => (step === 2 ? saveRecap() : setStep((current) => current + 1))}>
            <span>{step === 2 ? "Terminer" : "Continuer"}</span>
            <ArrowRightIcon width={18} height={18} />
          </button>
          <div className="recap-progress" aria-label="Progression">
            {[0, 1, 2].map((index) => (
              <span className={index === step ? "is-active" : ""} key={index} />
            ))}
          </div>
        </footer>
      )}
    </section>
  );
}
