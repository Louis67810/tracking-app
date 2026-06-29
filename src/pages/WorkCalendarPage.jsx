import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  XMarkIcon
} from "@heroicons/react/24/solid";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const START_HOUR = 0;
const END_HOUR = 24;
const HOUR_HEIGHT = 52;
const SWIPE_REVEAL = 116;
const SWIPE_THRESHOLD = 72;
const QUICK_MENU_WIDTH = 176;
const QUICK_MENU_HEIGHT = 240;
const QUICK_MENU_GAP = 8;

const colorOptions = [
  { name: "Bleu", value: "#8BE2FF", glow: "139, 226, 255" },
  { name: "Orange", value: "#FFC98B", glow: "255, 201, 139" },
  { name: "Rouge", value: "#FF8B8B", glow: "255, 139, 139" },
  { name: "Vert", value: "#9BE7C4", glow: "155, 231, 196" }
];

const initialTasks = [
  { id: "screen-1", title: "Tâche", dayOffset: 0, start: 6.5, duration: 1.75, color: colorOptions[0] },
  { id: "screen-2", title: "Tâche", dayOffset: 0, start: 8.5, duration: 1.75, color: colorOptions[1] },
  { id: "screen-3", title: "Tâche", dayOffset: 0, start: 10.5, duration: 1.75, color: colorOptions[2] }
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

function durationFromParts(hours, minutes) {
  return Math.max(1 / 60, Number(hours || 0) + Number(minutes || 0) / 60);
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
  const [dayOffset, setDayOffset] = useState(0);
  const [tasks, setTasks] = useState(initialTasks);
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [openSwipeTaskId, setOpenSwipeTaskId] = useState(null);
  const [swipePreview, setSwipePreview] = useState(null);
  const [quickMenu, setQuickMenu] = useState(null);
  const [draft, setDraft] = useState({
    title: "",
    color: colorOptions[0].value,
    dayOffset: 0,
    start: "12:30",
    durationHours: "1",
    durationMinutes: "0"
  });
  const dragState = useRef(null);
  const swipeState = useRef(null);
  const longPressTimer = useRef(null);

  const visibleTasks = useMemo(
    () => tasks.filter((task) => task.dayOffset === dayOffset).sort((a, b) => a.start - b.start),
    [tasks, dayOffset]
  );

  function createTask(event) {
    event.preventDefault();
    const color = colorOptions.find((option) => option.value === draft.color) ?? colorOptions[0];
    const duration = durationFromParts(draft.durationHours, draft.durationMinutes);
    const start = clampTaskStart(fromTimeValue(draft.start), duration);

    setTasks((current) => [
      ...current,
      {
        id: crypto.randomUUID?.() ?? `task-${Date.now()}`,
        title: draft.title.trim() || "Tâche",
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
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== quickMenu.id) return task;
        const color = patch.color
          ? colorOptions.find((option) => option.value === patch.color) ?? task.color
          : task.color;
        const nextDuration =
          patch.durationHours !== undefined || patch.durationMinutes !== undefined
            ? durationFromParts(
                patch.durationHours ?? quickMenu.durationHours,
                patch.durationMinutes ?? quickMenu.durationMinutes
              )
            : task.duration;
        return {
          ...task,
          title: patch.title ?? task.title,
          color,
          duration: nextDuration,
          start: clampTaskStart(task.start, nextDuration)
        };
      })
    );
    setQuickMenu((current) => (current ? { ...current, ...patch } : current));
  }

  function deleteQuickTask() {
    if (!quickMenu) return;
    deleteTask(quickMenu.id);
  }

  function deleteTask(taskId) {
    setTasks((current) => current.filter((task) => task.id !== taskId));
    setQuickMenu(null);
    setOpenSwipeTaskId(null);
    setSwipePreview(null);
  }

  function openQuickMenuFromButton(task, event) {
    const boardRect = event.currentTarget.closest(".calendar-board")?.getBoundingClientRect();
    const taskRect = event.currentTarget.closest(".task-swipe-shell")?.getBoundingClientRect();
    if (!boardRect || !taskRect) return;
    openQuickMenu(task, getQuickMenuAnchor(taskRect, boardRect));
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
        .filter((task) => task.id !== drag.id && task.dayOffset === draggedTask?.dayOffset)
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
        .sort((a, b) => (a.dayOffset === b.dayOffset ? a.start - b.start : a.dayOffset - b.dayOffset));
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
                      <button type="button" onClick={() => deleteTask(task.id)}>
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
                {colorOptions.map((option) => (
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
          <form className="task-composer" onSubmit={createTask}>
            <button className="composer-close" type="button" aria-label="Fermer" onClick={() => setComposerOpen(false)}>
              <XMarkIcon width={20} height={20} />
            </button>

            <div className="composer-fields">
              <label className="composer-field">
                <span>Nom</span>
                <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Tâche" />
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
