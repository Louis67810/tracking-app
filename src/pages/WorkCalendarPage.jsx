import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  XMarkIcon
} from "@heroicons/react/24/solid";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const START_HOUR = 6;
const END_HOUR = 22;
const HOUR_HEIGHT = 52;

const colorOptions = [
  { name: "Bleu", value: "#8BE2FF", glow: "139, 226, 255" },
  { name: "Orange", value: "#FFC98B", glow: "255, 201, 139" },
  { name: "Rouge", value: "#FF8B8B", glow: "255, 139, 139" },
  { name: "Vert", value: "#9BE7C4", glow: "155, 231, 196" }
];

const initialTasks = [
  { id: "screen-1", title: "Tâche", subtitle: "Temps d'écran moyen", dayOffset: 0, start: 6.5, duration: 1.75, color: colorOptions[0] },
  { id: "screen-2", title: "Tâche", subtitle: "Temps d'écran moyen", dayOffset: 0, start: 8.5, duration: 1.75, color: colorOptions[1] },
  { id: "screen-3", title: "Tâche", subtitle: "Temps d'écran moyen", dayOffset: 0, start: 10.5, duration: 1.75, color: colorOptions[2] }
];

function formatDate(offset) {
  if (offset === 0) return "Aujourd'hui";
  if (offset === -1) return "Hier";
  if (offset === 1) return "Demain";

  const formatter = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return formatter.format(date).replace(".", "");
}

function fromTimeValue(value) {
  const [hour, minutes] = value.split(":").map(Number);
  return hour + minutes / 60;
}

function clampTaskStart(start, duration) {
  return Math.max(START_HOUR, Math.min(END_HOUR - duration, start));
}

function nearestQuarter(value) {
  return Math.round(value * 4) / 4;
}

export default function WorkCalendarPage() {
  const navigate = useNavigate();
  const [dayOffset, setDayOffset] = useState(0);
  const [tasks, setTasks] = useState(initialTasks);
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    color: colorOptions[0].value,
    dayOffset: 0,
    start: "12:30",
    duration: "1"
  });
  const dragState = useRef(null);

  const visibleTasks = useMemo(
    () => tasks.filter((task) => task.dayOffset === dayOffset).sort((a, b) => a.start - b.start),
    [tasks, dayOffset]
  );

  const freeBlocks = useMemo(() => {
    const gaps = [];
    let cursor = START_HOUR;

    visibleTasks.forEach((task) => {
      if (task.start - cursor >= 0.75) {
        gaps.push({ id: `free-${cursor}`, start: cursor, duration: task.start - cursor });
      }
      cursor = Math.max(cursor, task.start + task.duration);
    });

    if (END_HOUR - cursor >= 0.75) {
      gaps.push({ id: `free-${cursor}`, start: cursor, duration: END_HOUR - cursor });
    }

    return gaps;
  }, [visibleTasks]);

  function createTask(event) {
    event.preventDefault();
    const color = colorOptions.find((option) => option.value === draft.color) ?? colorOptions[0];
    const duration = Number(draft.duration);
    const start = clampTaskStart(fromTimeValue(draft.start), duration);

    setTasks((current) => [
      ...current,
      {
        id: crypto.randomUUID?.() ?? `task-${Date.now()}`,
        title: draft.title.trim() || "Tâche",
        subtitle: "Objectif lié à définir",
        dayOffset: Number(draft.dayOffset),
        start,
        duration,
        color
      }
    ]);
    setDayOffset(Number(draft.dayOffset));
    setComposerOpen(false);
    setDraft((current) => ({ ...current, title: "" }));
  }

  function startDrag(event, task) {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragState.current = {
      id: task.id,
      initialY: event.clientY,
      initialStart: task.start,
      duration: task.duration
    };
  }

  function moveDrag(event) {
    const drag = dragState.current;
    if (!drag) return;

    const deltaHours = (event.clientY - drag.initialY) / HOUR_HEIGHT;
    const nextStart = clampTaskStart(nearestQuarter(drag.initialStart + deltaHours), drag.duration);
    setTasks((current) => current.map((task) => (task.id === drag.id ? { ...task, start: nextStart } : task)));
  }

  function endDrag() {
    dragState.current = null;
  }

  return (
    <section className="calendar-page page-surface">
      <div className={isComposerOpen ? "calendar-content is-blurred" : "calendar-content"}>
        <header className="calendar-topbar">
          <button className="calendar-back" type="button" aria-label="Retour" onClick={() => navigate("/travail")}>
            <ArrowLeftIcon width={24} height={24} />
          </button>

          <div className="day-switcher" aria-label="Navigation des jours">
            <button type="button" aria-label="Jour précédent" onClick={() => setDayOffset((value) => value - 1)}>
              <ChevronLeftIcon width={24} height={24} />
            </button>
            <div className="day-pill">{formatDate(dayOffset)}</div>
            <button type="button" aria-label="Jour suivant" onClick={() => setDayOffset((value) => value + 1)}>
              <ChevronRightIcon width={24} height={24} />
            </button>
          </div>

          <button className="calendar-add" type="button" aria-label="Créer une tâche" onClick={() => setComposerOpen(true)}>
            <PlusIcon width={24} height={24} />
          </button>
        </header>

        <div className="divider calendar-divider" />

        <div className="calendar-board">
          <div className="calendar-scroll">
            <div className="time-rail" aria-hidden="true">
              {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => START_HOUR + index).map((hour) => (
                <span key={hour}>{hour}h</span>
              ))}
            </div>

            <div className="calendar-grid" style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }}>
              {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => (
                <span className="hour-line" style={{ top: index * HOUR_HEIGHT }} key={index} />
              ))}

              {freeBlocks.map((block) => (
                <div
                  className="free-block"
                  key={block.id}
                  style={{
                    top: (block.start - START_HOUR) * HOUR_HEIGHT,
                    height: Math.max(84, block.duration * HOUR_HEIGHT - 12)
                  }}
                >
                  <span>Libre</span>
                </div>
              ))}

              {visibleTasks.map((task) => (
                <article
                  className="calendar-task"
                  key={task.id}
                  style={{
                    top: (task.start - START_HOUR) * HOUR_HEIGHT,
                    height: Math.max(92, task.duration * HOUR_HEIGHT - 12),
                    "--task-glow": task.color.glow
                  }}
                >
                  <div className="task-copy">
                    <strong>{task.title}</strong>
                    <span>{task.subtitle}</span>
                  </div>
                  <button
                    className="task-grip"
                    type="button"
                    aria-label="Déplacer la tâche"
                    onPointerDown={(event) => startDrag(event, task)}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                  >
                    {Array.from({ length: 12 }, (_, index) => (
                      <i key={index} />
                    ))}
                  </button>
                  <span className="task-light" />
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isComposerOpen && (
        <div className="task-composer-layer" role="presentation">
          <form className="task-composer" onSubmit={createTask}>
            <button className="composer-close" type="button" aria-label="Fermer" onClick={() => setComposerOpen(false)}>
              <XMarkIcon width={20} height={20} />
            </button>

            <div className="composer-fields">
              <label className="composer-field">
                <span>Nom</span>
                <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Tâche" />
              </label>

              <label className="composer-field">
                <span>Objectif lié</span>
                <select disabled value="">
                  <option value="">À connecter plus tard</option>
                </select>
              </label>

              <div className="composer-row">
                <label className="composer-field">
                  <span>Jour</span>
                  <select value={draft.dayOffset} onChange={(event) => setDraft({ ...draft, dayOffset: event.target.value })}>
                    <option value="-1">Hier</option>
                    <option value="0">Aujourd'hui</option>
                    <option value="1">Demain</option>
                  </select>
                </label>

                <label className="composer-field">
                  <span>Heure</span>
                  <input type="time" min="06:00" max="21:30" step="900" value={draft.start} onChange={(event) => setDraft({ ...draft, start: event.target.value })} />
                </label>

                <label className="composer-field">
                  <span>Durée</span>
                  <select value={draft.duration} onChange={(event) => setDraft({ ...draft, duration: event.target.value })}>
                    <option value="0.5">30 min</option>
                    <option value="1">1 h</option>
                    <option value="1.5">1 h 30</option>
                    <option value="2">2 h</option>
                    <option value="3">3 h</option>
                  </select>
                </label>
              </div>

              <div className="color-picker" aria-label="Couleur">
                {colorOptions.map((option) => (
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
