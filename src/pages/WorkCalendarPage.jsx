import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  XMarkIcon
} from "@heroicons/react/24/solid";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  clampTaskStart,
  durationFromParts,
  findWorkColor,
  startToTime,
  timeToStart,
  useWorkData,
  workColors
} from "../work/WorkDataContext.jsx";

const START_HOUR = 0;
const END_HOUR = 24;
const HOUR_HEIGHT = 52;
const SWIPE_REVEAL = 116;
const SWIPE_THRESHOLD = 72;
const QUICK_MENU_WIDTH = 176;
const QUICK_MENU_HEIGHT = 240;
const QUICK_MENU_GAP = 8;

function formatDate(offset) {
  if (offset === 0) return "Aujourd'hui";
  if (offset === -1) return "Hier";
  if (offset === 1) return "Demain";

  const formatter = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return formatter.format(date).replace(".", "");
}

function nearestQuarter(value) {
  return Math.round(value * 4) / 4;
}

function getQuickMenuAnchor(taskRect, boardRect) {
  const taskLeft = taskRect.left - boardRect.left;
  const taskTop = taskRect.top - boardRect.top;
  const taskBottom = taskRect.bottom - boardRect.top;
  const maxX = boardRect.width - QUICK_MENU_WIDTH - QUICK_MENU_GAP;
  const belowY = taskBottom + QUICK_MENU_GAP;
  const topY = taskTop - QUICK_MENU_HEIGHT - QUICK_MENU_GAP;
  const y = belowY + QUICK_MENU_HEIGHT <= boardRect.height - QUICK_MENU_GAP ? belowY : topY;

  return {
    x: Math.min(maxX, Math.max(QUICK_MENU_GAP, taskLeft)),
    y: Math.max(QUICK_MENU_GAP, y)
  };
}

export default function WorkCalendarPage() {
  const navigate = useNavigate();
  const { tasks, setTasks, createTask, updateTask, deleteTask, scheduleTask } = useWorkData();
  const [dayOffset, setDayOffset] = useState(0);
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [openSwipeTaskId, setOpenSwipeTaskId] = useState(null);
  const [swipePreview, setSwipePreview] = useState(null);
  const [quickMenu, setQuickMenu] = useState(null);
  const [draft, setDraft] = useState({
    mode: "create",
    taskId: "",
    title: "",
    color: workColors[0].value,
    dayOffset: 0,
    start: "12:30",
    durationHours: "1",
    durationMinutes: "0"
  });
  const dragState = useRef(null);
  const swipeState = useRef(null);
  const longPressTimer = useRef(null);

  const visibleTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.hasDate && task.dayOffset === dayOffset && task.start !== null)
        .slice()
        .sort((a, b) => a.start - b.start),
    [tasks, dayOffset]
  );

  const assignableTasks = useMemo(
    () => tasks.slice().sort((a, b) => a.title.localeCompare(b.title)),
    [tasks]
  );

  function submitCalendarTask(event) {
    event.preventDefault();
    const duration = durationFromParts(draft.durationHours, draft.durationMinutes);
    const start = clampTaskStart(timeToStart(draft.start), duration);
    const nextDay = Number(draft.dayOffset);

    if (draft.mode === "assign" && draft.taskId) {
      scheduleTask(draft.taskId, { dayOffset: nextDay, start, duration });
    } else {
      createTask({
        title: draft.title,
        hasDate: true,
        dayOffset: nextDay,
        start,
        duration,
        color: draft.color
      });
    }

    setDayOffset(nextDay);
    setComposerOpen(false);
    setDraft((current) => ({ ...current, title: "" }));
  }

  function openQuickMenu(task, anchor) {
    setOpenSwipeTaskId(null);
    setSwipePreview(null);
    setQuickMenu({
      id: task.id,
      title: task.title,
      color: task.color.value,
      durationHours: String(Math.floor(task.duration)),
      durationMinutes: String(Math.round((task.duration - Math.floor(task.duration)) * 60)),
      x: anchor.x,
      y: Math.max(12, anchor.y)
    });
  }

  function startLongPress(task, event) {
    if (event.target.closest(".task-grip")) return;
    const boardRect = event.currentTarget.closest(".calendar-board")?.getBoundingClientRect();
    const taskRect = event.currentTarget.getBoundingClientRect();
    if (!boardRect) return;
    const anchor = getQuickMenuAnchor(taskRect, boardRect);
    window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => openQuickMenu(task, anchor), 520);
  }

  function cancelLongPress() {
    window.clearTimeout(longPressTimer.current);
  }

  function updateQuickTask(patch) {
    if (!quickMenu) return;
    const currentTask = tasks.find((task) => task.id === quickMenu.id);
    if (!currentTask) return;

    const nextDuration =
      patch.durationHours !== undefined || patch.durationMinutes !== undefined
        ? durationFromParts(
            patch.durationHours ?? quickMenu.durationHours,
            patch.durationMinutes ?? quickMenu.durationMinutes
          )
        : currentTask.duration;

    updateTask(quickMenu.id, {
      title: patch.title ?? currentTask.title,
      color: patch.color ? findWorkColor(patch.color) : currentTask.color,
      duration: nextDuration,
      start: clampTaskStart(currentTask.start, nextDuration)
    });
    setQuickMenu((current) => (current ? { ...current, ...patch } : current));
  }

  function deleteQuickTask() {
    if (!quickMenu) return;
    deleteTask(quickMenu.id);
    setQuickMenu(null);
  }

  function openQuickMenuFromButton(task, event) {
    const boardRect = event.currentTarget.closest(".calendar-board")?.getBoundingClientRect();
    const taskRect = event.currentTarget.closest(".task-swipe-shell")?.getBoundingClientRect();
    if (!boardRect || !taskRect) return;
    openQuickMenu(task, getQuickMenuAnchor(taskRect, boardRect));
  }

  function deleteCalendarTask(taskId) {
    deleteTask(taskId);
    setQuickMenu(null);
    setOpenSwipeTaskId(null);
    setSwipePreview(null);
  }

  function startSwipe(event, task) {
    if (event.target.closest(".task-grip") || event.target.closest(".swipe-actions")) return;
    if (openSwipeTaskId && openSwipeTaskId !== task.id) setOpenSwipeTaskId(null);
    const initialOffset = openSwipeTaskId === task.id ? SWIPE_REVEAL : 0;
    swipeState.current = {
      id: task.id,
      startX: event.clientX,
      startY: event.clientY,
      initialOffset,
      isHorizontal: false,
      offset: initialOffset
    };
  }

  function moveSwipe(event) {
    const swipe = swipeState.current;
    if (!swipe) return;

    const dx = event.clientX - swipe.startX;
    const dy = event.clientY - swipe.startY;
    if (!swipe.isHorizontal) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        swipeState.current = null;
        return;
      }
      swipe.isHorizontal = true;
      setQuickMenu(null);
      window.clearTimeout(longPressTimer.current);
    }

    const nextOffset = Math.max(0, Math.min(SWIPE_REVEAL + 16, swipe.initialOffset + dx));
    swipe.offset = nextOffset;
    setSwipePreview({ id: swipe.id, x: nextOffset });
    event.preventDefault();
  }

  function endSwipe() {
    const swipe = swipeState.current;
    if (!swipe) return;

    if (swipe.isHorizontal) {
      setOpenSwipeTaskId(swipe.offset >= SWIPE_THRESHOLD ? swipe.id : null);
      setSwipePreview(null);
    }
    swipeState.current = null;
  }

  function startDrag(event, task) {
    event.preventDefault();
    setQuickMenu(null);
    setOpenSwipeTaskId(null);
    setSwipePreview(null);
    window.clearTimeout(longPressTimer.current);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setActiveTaskId(task.id);
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
    setTasks((current) => {
      const draggedTask = current.find((task) => task.id === drag.id);
      const crossedTask = current
        .filter((task) => task.id !== drag.id && task.hasDate && task.dayOffset === draggedTask?.dayOffset)
        .find((task) => {
          const wasAbove = drag.initialStart < task.start;
          const wasBelow = drag.initialStart > task.start;
          const draggedMid = nextStart + drag.duration / 2;
          const targetMid = task.start + task.duration / 2;
          return (wasAbove && draggedMid > targetMid) || (wasBelow && draggedMid < targetMid);
        });
      const moved = current.map((task) => {
        if (task.id === drag.id) return { ...task, start: nextStart };
        if (crossedTask && task.id === crossedTask.id) return { ...task, start: drag.initialStart };
        return task;
      });
      if (crossedTask) {
        drag.initialStart = crossedTask.start;
        drag.initialY = event.clientY;
      }
      return moved
        .slice()
        .sort((a, b) => (a.dayOffset === b.dayOffset ? (a.start ?? 0) - (b.start ?? 0) : (a.dayOffset ?? 0) - (b.dayOffset ?? 0)));
    });
  }

  function endDrag() {
    dragState.current = null;
    setActiveTaskId(null);
  }

  return (
    <section
      className="calendar-page page-surface"
      onPointerDown={() => {
        if (quickMenu) setQuickMenu(null);
        if (openSwipeTaskId) setOpenSwipeTaskId(null);
      }}
    >
      <div className={isComposerOpen ? "calendar-content is-blurred" : "calendar-content"}>
        <header className="calendar-topbar">
          <button className="calendar-back" type="button" aria-label="Retour" onClick={() => navigate("/travail")}>
            <ArrowLeftIcon width={24} height={24} />
          </button>

          <div className="day-switcher" aria-label="Navigation des jours">
            <button type="button" aria-label="Jour precedent" onClick={() => setDayOffset((value) => value - 1)}>
              <ChevronLeftIcon width={24} height={24} />
            </button>
            <div className="day-pill">{formatDate(dayOffset)}</div>
            <button type="button" aria-label="Jour suivant" onClick={() => setDayOffset((value) => value + 1)}>
              <ChevronRightIcon width={24} height={24} />
            </button>
          </div>

          <button className="calendar-add" type="button" aria-label="Creer une tache" onClick={() => setComposerOpen(true)}>
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

              {visibleTasks.map((task) => {
                const swipeOffset =
                  swipePreview?.id === task.id ? swipePreview.x : openSwipeTaskId === task.id ? SWIPE_REVEAL : 0;

                return (
                  <div
                    className={openSwipeTaskId === task.id ? "task-swipe-shell is-swiped" : "task-swipe-shell"}
                    key={task.id}
                    style={{
                      top: (task.start - START_HOUR) * HOUR_HEIGHT,
                      height: Math.max(92, task.duration * HOUR_HEIGHT - 12),
                      "--task-glow": task.color.glow
                    }}
                  >
                    <div className="swipe-actions" onPointerDown={(event) => event.stopPropagation()}>
                      <button type="button" onClick={(event) => openQuickMenuFromButton(task, event)}>
                        Modifier
                      </button>
                      <button type="button" onClick={() => deleteCalendarTask(task.id)}>
                        Supprimer
                      </button>
                    </div>

                    <article
                      className={activeTaskId === task.id ? "calendar-task is-dragging" : "calendar-task"}
                      style={{ "--swipe-x": `${swipeOffset}px` }}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        startSwipe(event, task);
                        startLongPress(task, event);
                      }}
                      onPointerMove={moveSwipe}
                      onPointerUp={() => {
                        endSwipe();
                        cancelLongPress();
                      }}
                      onPointerCancel={() => {
                        endSwipe();
                        cancelLongPress();
                      }}
                      onPointerLeave={cancelLongPress}
                    >
                      <div className="task-copy">
                        <strong>{task.title}</strong>
                      </div>
                      <button
                        className="task-grip"
                        type="button"
                        aria-label="Deplacer la tache"
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
                  </div>
                );
              })}
            </div>
          </div>
          {quickMenu && (
            <div
              className="quick-task-menu"
              style={{ left: quickMenu.x, top: quickMenu.y }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <label>
                <span>Nom</span>
                <input
                  value={quickMenu.title}
                  onChange={(event) => {
                    setQuickMenu({ ...quickMenu, title: event.target.value });
                    updateQuickTask({ title: event.target.value });
                  }}
                />
              </label>

              <div className="quick-color-row">
                {workColors.map((option) => (
                  <button
                    className={quickMenu.color === option.value ? "color-swatch is-selected" : "color-swatch"}
                    type="button"
                    key={option.value}
                    aria-label={option.name}
                    style={{ background: option.value }}
                    onClick={() => {
                      setQuickMenu({ ...quickMenu, color: option.value });
                      updateQuickTask({ color: option.value });
                    }}
                  />
                ))}
              </div>

              <div className="quick-duration-row">
                <label>
                  <span>H</span>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    value={quickMenu.durationHours}
                    onChange={(event) => updateQuickTask({ durationHours: event.target.value })}
                  />
                </label>
                <label>
                  <span>Min</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={quickMenu.durationMinutes}
                    onChange={(event) => updateQuickTask({ durationMinutes: event.target.value })}
                  />
                </label>
              </div>

              <button className="quick-delete" type="button" onClick={deleteQuickTask}>
                Supprimer
              </button>
            </div>
          )}
        </div>
      </div>

      {isComposerOpen && (
        <div className="task-composer-layer" role="presentation">
          <form className="task-composer" onSubmit={submitCalendarTask}>
            <button className="composer-close" type="button" aria-label="Fermer" onClick={() => setComposerOpen(false)}>
              <XMarkIcon width={20} height={20} />
            </button>

            <div className="composer-fields">
              <div className="composer-mode">
                <button
                  className={draft.mode === "create" ? "is-selected" : ""}
                  type="button"
                  onClick={() => setDraft({ ...draft, mode: "create" })}
                >
                  Creer
                </button>
                <button
                  className={draft.mode === "assign" ? "is-selected" : ""}
                  type="button"
                  onClick={() => setDraft({ ...draft, mode: "assign", taskId: assignableTasks[0]?.id ?? "" })}
                >
                  Assigner
                </button>
              </div>

              {draft.mode === "assign" ? (
                <label className="composer-field">
                  <span>Tache</span>
                  <select value={draft.taskId} onChange={(event) => setDraft({ ...draft, taskId: event.target.value })}>
                    {assignableTasks.map((task) => (
                      <option value={task.id} key={task.id}>
                        {task.title}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="composer-field">
                  <span>Nom</span>
                  <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Tache" />
                </label>
              )}

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
                  <input type="time" min="00:00" max="23:59" step="60" value={draft.start} onChange={(event) => setDraft({ ...draft, start: event.target.value })} />
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

              {draft.mode === "create" && (
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
              )}
            </div>

            <button className="create-task-button" type="submit">
              {draft.mode === "assign" ? "Assigner la tâche" : "Créer la tâche"}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
