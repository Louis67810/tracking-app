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

const taskColors = [
  { name: "Rouge", value: "#FF8B8D", glow: "255, 139, 141" },
  { name: "Violet", value: "#A48BFF", glow: "164, 139, 255" },
  { name: "Vert", value: "#66EB6A", glow: "102, 235, 106" },
  { name: "Menthe", value: "#8BFFE8", glow: "139, 255, 232" }
];

const initialTasks = [
  {
    id: "task-1",
    title: "Temps d'ecran moyen",
    dayOffset: 0,
    time: "10:00",
    completed: false,
    color: taskColors[0],
    hasDate: true
  },
  {
    id: "task-2",
    title: "Temps d'ecran moyen",
    dayOffset: 0,
    time: "10:30",
    completed: true,
    color: taskColors[1],
    hasDate: true
  },
  {
    id: "task-3",
    title: "Temps d'ecran moyen",
    dayOffset: 1,
    time: "14:00",
    completed: true,
    color: taskColors[2],
    hasDate: true
  },
  {
    id: "task-4",
    title: "Temps d'ecran moyen",
    dayOffset: null,
    time: "",
    completed: false,
    color: taskColors[3],
    hasDate: false
  }
];

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
  return task.time ? `${day} ${task.time}` : day;
}

function sortTasks(a, b) {
  if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
  if (a.hasDate !== b.hasDate) return Number(b.hasDate) - Number(a.hasDate);
  return (a.time || "99:99").localeCompare(b.time || "99:99");
}

export default function WorkTasksPage() {
  const navigate = useNavigate();
  const [dayOffset, setDayOffset] = useState(0);
  const [tasks, setTasks] = useState(initialTasks);
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    hasDate: true,
    dayOffset: 0,
    time: "10:00",
    color: taskColors[0].value
  });

  const visibleTasks = useMemo(
    () =>
      tasks
        .filter((task) => !task.hasDate || task.dayOffset === dayOffset)
        .slice()
        .sort(sortTasks),
    [tasks, dayOffset]
  );

  function createTask(event) {
    event.preventDefault();
    const color = taskColors.find((option) => option.value === draft.color) ?? taskColors[0];
    const day = draft.hasDate ? Number(draft.dayOffset) : null;

    setTasks((current) => [
      ...current,
      {
        id: crypto.randomUUID?.() ?? `task-${Date.now()}`,
        title: draft.title.trim() || "Nouvelle tache",
        hasDate: draft.hasDate,
        dayOffset: day,
        time: draft.hasDate ? draft.time : "",
        completed: false,
        color
      }
    ]);
    if (draft.hasDate) setDayOffset(day);
    setDraft((current) => ({ ...current, title: "" }));
    setComposerOpen(false);
  }

  function toggleTask(taskId) {
    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task))
    );
  }

  function moveTaskDay(taskId, direction) {
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) return task;
        const nextDay = task.hasDate ? (task.dayOffset ?? dayOffset) + direction : dayOffset + direction;
        return { ...task, hasDate: true, dayOffset: nextDay };
      })
    );
  }

  return (
    <section className="tasks-page page-surface">
      <div className={isComposerOpen ? "tasks-content is-blurred" : "tasks-content"}>
        <header className="tasks-topbar">
          <button className="calendar-back" type="button" aria-label="Retour" onClick={() => navigate("/travail")}>
            <ArrowLeftIcon width={24} height={24} />
          </button>

          <div className="tasks-day-switcher" aria-label="Navigation des jours">
            <button type="button" aria-label="Jour precedent" onClick={() => setDayOffset((value) => value - 1)}>
              <ChevronLeftIcon width={24} height={24} />
            </button>
            <div className="tasks-day-pill">{formatDay(dayOffset)}</div>
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
                <button type="button" aria-label="Jour precedent" onClick={() => moveTaskDay(task.id, -1)}>
                  <ChevronLeftIcon width={14} height={14} />
                </button>
                <span>{task.hasDate ? "Date" : "Sans date"}</span>
                <button type="button" aria-label="Jour suivant" onClick={() => moveTaskDay(task.id, 1)}>
                  <ChevronRightIcon width={14} height={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {isComposerOpen && (
        <div className="task-composer-layer" role="presentation">
          <form className="task-composer tasks-composer" onSubmit={createTask}>
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
              </div>

              <div className="color-picker" aria-label="Couleur">
                {taskColors.map((option) => (
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
