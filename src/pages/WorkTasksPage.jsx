import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  XMarkIcon
} from "@heroicons/react/24/solid";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  durationFromParts,
  startToTime,
  timeToStart,
  useWorkData,
  workColors
} from "../work/WorkDataContext.jsx";

function formatDay(offset) {
  if (offset === 0) return "Aujourd'hui";
  if (offset === -1) return "Hier";
  if (offset === 1) return "Demain";

  const formatter = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return formatter.format(date).replace(".", "");
}

function formatTaskDate(task) {
  if (!task.hasDate || task.dayOffset === null) return "Sans date";

  const formatter = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  const date = new Date();
  date.setDate(date.getDate() + task.dayOffset);
  const day = formatter.format(date);
  const time = startToTime(task.start);
  return time ? `${day} ${time}` : day;
}

function sortTasks(a, b) {
  if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
  if (a.hasDate !== b.hasDate) return Number(b.hasDate) - Number(a.hasDate);
  return (startToTime(a.start) || "99:99").localeCompare(startToTime(b.start) || "99:99");
}

export default function WorkTasksPage() {
  const navigate = useNavigate();
  const { tasks, createTask, toggleTask } = useWorkData();
  const [dayOffset, setDayOffset] = useState(0);
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    hasDate: true,
    dayOffset: 0,
    time: "10:00",
    durationHours: "1",
    durationMinutes: "0",
    color: workColors[0].value
  });

  const visibleTasks = useMemo(
    () =>
      tasks
        .filter((task) => !task.hasDate || task.dayOffset === dayOffset)
        .slice()
        .sort(sortTasks),
    [tasks, dayOffset]
  );

  function submitTask(event) {
    event.preventDefault();
    const duration = durationFromParts(draft.durationHours, draft.durationMinutes);
    const task = createTask({
      title: draft.title,
      hasDate: draft.hasDate,
      dayOffset: draft.dayOffset,
      start: draft.hasDate ? timeToStart(draft.time) : null,
      duration,
      color: draft.color
    });
    if (task.hasDate) setDayOffset(task.dayOffset);
    setDraft((current) => ({ ...current, title: "" }));
    setComposerOpen(false);
  }

  return (
    <section className="tasks-page page-surface">
      <div className={isComposerOpen ? "tasks-content is-blurred" : "tasks-content"}>
        <header className="tasks-topbar">
          <button className="calendar-back" type="button" aria-label="Retour" onClick={() => navigate("/travail")}>
            <ArrowLeftIcon width={24} height={24} />
          </button>

          <div className="day-switcher" aria-label="Navigation des jours">
            <button type="button" aria-label="Jour precedent" onClick={() => setDayOffset((value) => value - 1)}>
              <ChevronLeftIcon width={24} height={24} />
            </button>
            <div className="day-pill">{formatDay(dayOffset)}</div>
            <button type="button" aria-label="Jour suivant" onClick={() => setDayOffset((value) => value + 1)}>
              <ChevronRightIcon width={24} height={24} />
            </button>
          </div>

          <button className="calendar-add" type="button" aria-label="Creer une tache" onClick={() => setComposerOpen(true)}>
            <PlusIcon width={24} height={24} />
          </button>
        </header>

        <h1 className="tasks-title">Tes tâches</h1>
        <div className="divider tasks-divider" />

        <div className="tasks-list" aria-label="Liste des taches">
          {visibleTasks.map((task) => (
            <article className={task.completed ? "task-row is-complete" : "task-row"} key={task.id}>
              <div className="task-main">
                <button
                  className="task-check"
                  type="button"
                  aria-label={task.completed ? "Marquer comme a faire" : "Marquer comme terminee"}
                  onClick={() => toggleTask(task.id)}
                >
                  {task.completed && <CheckIcon width={16} height={16} />}
                </button>

                <div className="task-text">
                  <strong>{task.title}</strong>
                  <span>{formatTaskDate(task)}</span>
                </div>
              </div>

              <div className="task-actions-pill" style={{ "--task-row-glow": task.color.glow }}>
                <span>Objectif</span>
              </div>
            </article>
          ))}
        </div>
      </div>

      {isComposerOpen && (
        <div className="task-composer-layer" role="presentation">
          <form className="task-composer tasks-composer" onSubmit={submitTask}>
            <button className="composer-close" type="button" aria-label="Fermer" onClick={() => setComposerOpen(false)}>
              <XMarkIcon width={20} height={20} />
            </button>

            <div className="composer-fields">
              <label className="composer-field">
                <span>Nom</span>
                <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Tache" />
              </label>

              <label className="date-toggle">
                <input
                  type="checkbox"
                  checked={draft.hasDate}
                  onChange={(event) => setDraft({ ...draft, hasDate: event.target.checked })}
                />
                <span>Ajouter une date</span>
              </label>

              <div className="composer-row">
                <label className="composer-field">
                  <span>Jour</span>
                  <select
                    value={draft.dayOffset}
                    disabled={!draft.hasDate}
                    onChange={(event) => setDraft({ ...draft, dayOffset: event.target.value })}
                  >
                    <option value="-1">Hier</option>
                    <option value="0">Aujourd'hui</option>
                    <option value="1">Demain</option>
                  </select>
                </label>

                <label className="composer-field">
                  <span>Heure</span>
                  <input
                    type="time"
                    disabled={!draft.hasDate}
                    value={draft.time}
                    onChange={(event) => setDraft({ ...draft, time: event.target.value })}
                  />
                </label>

                <label className="composer-field">
                  <span>Heures</span>
                  <input type="number" min="0" max="24" value={draft.durationHours} onChange={(event) => setDraft({ ...draft, durationHours: event.target.value })} />
                </label>

                <label className="composer-field">
                  <span>Minutes</span>
                  <input type="number" min="0" max="59" value={draft.durationMinutes} onChange={(event) => setDraft({ ...draft, durationMinutes: event.target.value })} />
                </label>
              </div>

              <div className="color-picker" aria-label="Couleur">
                {workColors.map((option) => (
                  <button
                    className={draft.color === option.value ? "color-swatch is-selected" : "color-swatch"}
                    type="button"
                    key={option.value}
                    aria-label={option.name}
                    style={{ background: option.value }}
                    onClick={() => setDraft({ ...draft, color: option.value })}
                  />
                ))}
              </div>
            </div>

            <button className="create-task-button" type="submit">Créer la tâche</button>
          </form>
        </div>
      )}
    </section>
  );
}
