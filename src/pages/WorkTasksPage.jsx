import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  XMarkIcon
} from "@heroicons/react/24/solid";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  durationFromParts,
  startToTime,
  timeToStart,
  useWorkData,
  workColors
} from "../work/WorkDataContext.jsx";

const SWIPE_REVEAL = 116;
const SWIPE_THRESHOLD = 72;

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

  const formatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const date = new Date();
  date.setDate(date.getDate() + task.dayOffset);
  const time = startToTime(task.start);
  return `${formatter.format(date)}${time ? ` ${time}` : ""}`;
}

function sortTasks(a, b) {
  if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
  if (a.hasDate !== b.hasDate) return Number(b.hasDate) - Number(a.hasDate);
  return (startToTime(a.start) || "99:99").localeCompare(startToTime(b.start) || "99:99");
}

export default function WorkTasksPage() {
  const navigate = useNavigate();
  const { tasks, objectives, createTask, updateTask, deleteTask, toggleTask } = useWorkData();
  const [dayOffset, setDayOffset] = useState(0);
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [swipe, setSwipe] = useState({ id: null, x: 0, openId: null });
  const swipeRef = useRef(null);
  const [draft, setDraft] = useState({
    id: null,
    title: "",
    hasDate: true,
    dayOffset: 0,
    time: "10:00",
    durationHours: "1",
    durationMinutes: "0",
    color: workColors[0].value,
    objectiveId: "",
    subObjectiveId: ""
  });

  const visibleTasks = useMemo(
    () => tasks.filter((task) => !task.hasDate || task.dayOffset === dayOffset).slice().sort(sortTasks),
    [tasks, dayOffset]
  );

  const subOptions = useMemo(
    () => objectives.find((objective) => objective.id === draft.objectiveId)?.subObjectives ?? [],
    [objectives, draft.objectiveId]
  );

  function resetDraft() {
    setDraft({
      id: null,
      title: "",
      hasDate: true,
      dayOffset: 0,
      time: "10:00",
      durationHours: "1",
      durationMinutes: "0",
      color: workColors[0].value,
      objectiveId: "",
      subObjectiveId: ""
    });
  }

  function openCreate() {
    resetDraft();
    setComposerOpen(true);
  }

  function openEdit(task) {
    setDraft({
      id: task.id,
      title: task.title,
      hasDate: task.hasDate,
      dayOffset: task.dayOffset ?? 0,
      time: startToTime(task.start) || "10:00",
      durationHours: String(Math.floor(task.duration)),
      durationMinutes: String(Math.round((task.duration - Math.floor(task.duration)) * 60)),
      color: task.color.value,
      objectiveId: task.objectiveId ?? "",
      subObjectiveId: task.subObjectiveId ?? ""
    });
    setSwipe({ id: null, x: 0, openId: null });
    setComposerOpen(true);
  }

  function submitTask(event) {
    event.preventDefault();
    const duration = durationFromParts(draft.durationHours, draft.durationMinutes);
    const payload = {
      title: draft.title,
      hasDate: draft.hasDate,
      dayOffset: draft.hasDate ? draft.dayOffset : null,
      start: draft.hasDate ? timeToStart(draft.time) : null,
      duration,
      color: draft.color,
      objectiveId: draft.objectiveId || null,
      subObjectiveId: draft.subObjectiveId || null
    };

    if (draft.id) {
      updateTask(draft.id, payload);
      if (payload.hasDate) setDayOffset(Number(payload.dayOffset));
    } else {
      const task = createTask(payload);
      if (task.hasDate) setDayOffset(task.dayOffset);
    }
    resetDraft();
    setComposerOpen(false);
  }

  function startSwipe(event, taskId) {
    swipeRef.current = { id: taskId, startX: event.clientX, startY: event.clientY, x: 0, active: false };
  }

  function moveSwipe(event) {
    const current = swipeRef.current;
    if (!current) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (!current.active) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        swipeRef.current = null;
        return;
      }
      current.active = true;
    }
    current.x = Math.max(0, Math.min(SWIPE_REVEAL + 16, dx));
    setSwipe({ id: current.id, x: current.x, openId: null });
  }

  function endSwipe() {
    const current = swipeRef.current;
    if (!current) return;
    setSwipe({ id: current.id, x: current.x >= SWIPE_THRESHOLD ? SWIPE_REVEAL : 0, openId: current.x >= SWIPE_THRESHOLD ? current.id : null });
    swipeRef.current = null;
  }

  function offsetFor(taskId) {
    if (swipe.id === taskId) return swipe.x;
    if (swipe.openId === taskId) return SWIPE_REVEAL;
    return 0;
  }

  function objectiveLabel(task) {
    const objective = objectives.find((item) => item.id === task.objectiveId);
    return objective ? "Objectif" : "Objectif";
  }

  return (
    <section className="tasks-page page-surface" onPointerDown={() => swipe.openId && setSwipe({ id: null, x: 0, openId: null })}>
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
          <button className="calendar-add" type="button" aria-label="Creer une tache" onClick={openCreate}>
            <PlusIcon width={24} height={24} />
          </button>
        </header>

        <h1 className="tasks-title">Tes tâches</h1>
        <div className="divider tasks-divider" />

        <div className="tasks-list" aria-label="Liste des taches">
          {visibleTasks.map((task) => (
            <div className={swipe.openId === task.id ? "task-row-shell is-swiped" : "task-row-shell"} key={task.id}>
              <div className="swipe-actions task-row-actions" onPointerDown={(event) => event.stopPropagation()}>
                <button type="button" onClick={() => openEdit(task)}>Modifier</button>
                <button type="button" onClick={() => deleteTask(task.id)}>Supprimer</button>
              </div>
              <article
                className={task.completed ? "task-row is-complete" : "task-row"}
                style={{ "--task-swipe-x": `${offsetFor(task.id)}px` }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  startSwipe(event, task.id);
                }}
                onPointerMove={moveSwipe}
                onPointerUp={endSwipe}
                onPointerCancel={endSwipe}
              >
                <div className="task-main">
                  <button className="task-check" type="button" onClick={() => toggleTask(task.id)}>
                    {task.completed && <CheckIcon width={16} height={16} />}
                  </button>
                  <div className="task-text">
                    <strong>{task.title}</strong>
                    <span>{formatTaskDate(task)}</span>
                  </div>
                </div>
                <div className="task-actions-pill" style={{ "--task-row-glow": task.color.glow }}>
                  <span>{objectiveLabel(task)}</span>
                </div>
              </article>
            </div>
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
                <input type="checkbox" checked={draft.hasDate} onChange={(event) => setDraft({ ...draft, hasDate: event.target.checked })} />
                <span>Ajouter une date</span>
              </label>
              <div className="composer-row">
                <label className="composer-field">
                  <span>Jour</span>
                  <select value={draft.dayOffset} disabled={!draft.hasDate} onChange={(event) => setDraft({ ...draft, dayOffset: event.target.value })}>
                    <option value="-1">Hier</option>
                    <option value="0">Aujourd'hui</option>
                    <option value="1">Demain</option>
                  </select>
                </label>
                <label className="composer-field">
                  <span>Heure</span>
                  <input type="time" disabled={!draft.hasDate} value={draft.time} onChange={(event) => setDraft({ ...draft, time: event.target.value })} />
                </label>
                <label className="composer-field">
                  <span>Heures</span>
                  <input type="number" min="0" max="24" value={draft.durationHours} onChange={(event) => setDraft({ ...draft, durationHours: event.target.value })} />
                </label>
                <label className="composer-field">
                  <span>Minutes</span>
                  <input type="number" min="0" max="59" value={draft.durationMinutes} onChange={(event) => setDraft({ ...draft, durationMinutes: event.target.value })} />
                </label>
                <label className="composer-field">
                  <span>Objectif</span>
                  <select value={draft.objectiveId} onChange={(event) => setDraft({ ...draft, objectiveId: event.target.value, subObjectiveId: "" })}>
                    <option value="">Aucun</option>
                    {objectives.map((objective) => (
                      <option value={objective.id} key={objective.id}>{objective.title}</option>
                    ))}
                  </select>
                </label>
                <label className="composer-field">
                  <span>Sous-objectif</span>
                  <select value={draft.subObjectiveId} disabled={!draft.objectiveId} onChange={(event) => setDraft({ ...draft, subObjectiveId: event.target.value })}>
                    <option value="">Aucun</option>
                    {subOptions.map((subObjective) => (
                      <option value={subObjective.id} key={subObjective.id}>{subObjective.title}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="color-picker" aria-label="Couleur">
                {workColors.map((option) => (
                  <button className={draft.color === option.value ? "color-swatch is-selected" : "color-swatch"} type="button" key={option.value} aria-label={option.name} style={{ background: option.value }} onClick={() => setDraft({ ...draft, color: option.value })} />
                ))}
              </div>
            </div>
            <button className="create-task-button" type="submit">{draft.id ? "Modifier la tâche" : "Créer la tâche"}</button>
          </form>
        </div>
      )}
    </section>
  );
}
