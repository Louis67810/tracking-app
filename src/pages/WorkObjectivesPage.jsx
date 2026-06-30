import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  PlusIcon,
  XMarkIcon
} from "@heroicons/react/24/solid";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { startToTime, useWorkData, workColors } from "../work/WorkDataContext.jsx";

const SWIPE_REVEAL = 116;
const SWIPE_THRESHOLD = 72;

function formatTaskDate(task) {
  if (!task.hasDate || task.dayOffset === null) return "Sans date";
  const formatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const date = new Date();
  date.setDate(date.getDate() + task.dayOffset);
  const time = startToTime(task.start);
  return `${formatter.format(date)}${time ? ` ${time}` : ""}`;
}

function average(values) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function taskProgress(tasks) {
  return average(tasks.map((task) => (task.completed ? 100 : 0)));
}

export default function WorkObjectivesPage() {
  const navigate = useNavigate();
  const {
    tasks,
    objectives,
    createObjective,
    updateObjective,
    deleteObjective,
    createSubObjective,
    updateSubObjective,
    deleteSubObjective,
    createTask,
    toggleTask
  } = useWorkData();
  const [composer, setComposer] = useState(null);
  const [swipe, setSwipe] = useState({ type: null, id: null, x: 0, openId: null });
  const swipeRef = useRef(null);

  const objectiveViews = useMemo(
    () =>
      objectives.map((objective) => {
        const directTasks = tasks.filter((task) => task.objectiveId === objective.id && !task.subObjectiveId);
        const subViews = objective.subObjectives.map((subObjective) => {
          const linkedTasks = tasks.filter((task) => task.subObjectiveId === subObjective.id);
          return { ...subObjective, tasks: linkedTasks, progress: taskProgress(linkedTasks) };
        });
        const progressItems = [
          ...directTasks.map((task) => (task.completed ? 100 : 0)),
          ...subViews.map((subObjective) => subObjective.progress)
        ];
        return { ...objective, directTasks, subViews, progress: average(progressItems) };
      }),
    [objectives, tasks]
  );

  function openComposer(type, payload = {}) {
    setComposer({
      type,
      title: payload.title ?? "",
      color: payload.color?.value ?? workColors[0].value,
      objectiveId: payload.objectiveId ?? "",
      subObjectiveId: payload.subObjectiveId ?? "",
      id: payload.id ?? null
    });
  }

  function submitComposer(event) {
    event.preventDefault();
    if (!composer) return;

    if (composer.type === "objective") {
      createObjective({ title: composer.title, color: composer.color });
    }
    if (composer.type === "edit-objective") {
      updateObjective(composer.id, { title: composer.title, color: composer.color });
    }
    if (composer.type === "sub") {
      createSubObjective(composer.objectiveId, { title: composer.title });
    }
    if (composer.type === "edit-sub") {
      updateSubObjective(composer.objectiveId, composer.id, { title: composer.title });
    }
    if (composer.type === "task") {
      const objective = objectives.find((item) => item.id === composer.objectiveId);
      createTask({
        title: composer.title,
        hasDate: false,
        color: objective?.color ?? workColors[0],
        objectiveId: composer.objectiveId,
        subObjectiveId: composer.subObjectiveId || null
      });
    }
    setComposer(null);
    setSwipe({ type: null, id: null, x: 0, openId: null });
  }

  function startSwipe(event, type, id) {
    swipeRef.current = { type, id, startX: event.clientX, startY: event.clientY, x: 0, active: false };
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
    setSwipe({ type: current.type, id: current.id, x: current.x, openId: null });
  }

  function endSwipe() {
    const current = swipeRef.current;
    if (!current) return;
    setSwipe({
      type: current.type,
      id: current.id,
      x: current.x >= SWIPE_THRESHOLD ? SWIPE_REVEAL : 0,
      openId: current.x >= SWIPE_THRESHOLD ? `${current.type}-${current.id}` : null
    });
    swipeRef.current = null;
  }

  function actionOffset(type, id) {
    const key = `${type}-${id}`;
    if (swipe.type === type && swipe.id === id) return swipe.x;
    if (swipe.openId === key) return SWIPE_REVEAL;
    return 0;
  }

  return (
    <section className="objectives-page page-surface" onPointerDown={() => swipe.openId && setSwipe({ type: null, id: null, x: 0, openId: null })}>
      <div className={composer ? "objectives-content is-blurred" : "objectives-content"}>
        <header className="objectives-topbar">
          <button className="calendar-back" type="button" aria-label="Retour" onClick={() => navigate("/travail")}>
            <ArrowLeftIcon width={24} height={24} />
          </button>
          <button className="calendar-add" type="button" aria-label="Creer un objectif" onClick={() => openComposer("objective")}>
            <PlusIcon width={24} height={24} />
          </button>
        </header>

        <h1 className="objectives-title">Tes objectifs</h1>
        <div className="divider objectives-divider" />

        <div className="objectives-list">
          {objectiveViews.map((objective) => (
            <div className="objective-group" key={objective.id} style={{ "--objective-glow": objective.color.glow }}>
              <div className={swipe.openId === `objective-${objective.id}` ? "objective-swipe-shell is-swiped" : "objective-swipe-shell"}>
                <div className="swipe-actions objective-actions" onPointerDown={(event) => event.stopPropagation()}>
                  <button type="button" onClick={() => openComposer("edit-objective", objective)}>
                    Modifier
                  </button>
                  <button type="button" onClick={() => deleteObjective(objective.id)}>
                    Supprimer
                  </button>
                </div>
                <article
                  className="objective-card"
                  style={{ "--swipe-x": `${actionOffset("objective", objective.id)}px` }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    startSwipe(event, "objective", objective.id);
                  }}
                  onPointerMove={moveSwipe}
                  onPointerUp={endSwipe}
                  onPointerCancel={endSwipe}
                >
                  <button className="objective-main" type="button" onClick={() => updateObjective(objective.id, { expanded: !objective.expanded })}>
                    <span>{objective.title}</span>
                    <i className="progress-track">
                      <b style={{ width: `${objective.progress}%` }} />
                    </i>
                  </button>
                  <button className={objective.expanded ? "expand-button is-open" : "expand-button"} type="button" onClick={() => updateObjective(objective.id, { expanded: !objective.expanded })}>
                    <ChevronDownIcon width={16} height={16} />
                  </button>
                  <span className="objective-light" />
                </article>
              </div>

              {objective.expanded && (
                <div className="objective-children">
                  {objective.subViews.map((subObjective) => (
                    <div className="subobjective-group" key={subObjective.id}>
                      <article className="subobjective-card">
                        <button className="objective-main" type="button" onClick={() => updateSubObjective(objective.id, subObjective.id, { expanded: !subObjective.expanded })}>
                          <span>{subObjective.title}</span>
                          <i className="progress-track">
                            <b style={{ width: `${subObjective.progress}%` }} />
                          </i>
                        </button>
                        <button className={subObjective.expanded ? "expand-button is-open" : "expand-button"} type="button" onClick={() => updateSubObjective(objective.id, subObjective.id, { expanded: !subObjective.expanded })}>
                          <ChevronDownIcon width={16} height={16} />
                        </button>
                      </article>
                      {subObjective.expanded &&
                        subObjective.tasks.map((task) => (
                          <article className={task.completed ? "objective-task is-complete" : "objective-task"} key={task.id}>
                            <button className="task-check" type="button" onClick={() => toggleTask(task.id)}>
                              {task.completed && <CheckIcon width={16} height={16} />}
                            </button>
                            <div className="task-text">
                              <strong>{task.title}</strong>
                              <span>{formatTaskDate(task)}</span>
                            </div>
                          </article>
                        ))}
                      {subObjective.expanded && (
                        <button className="add-linked-task" type="button" onClick={() => openComposer("task", { objectiveId: objective.id, subObjectiveId: subObjective.id })}>
                          Ajouter une tâche
                        </button>
                      )}
                    </div>
                  ))}

                  {objective.directTasks.map((task) => (
                    <article className={task.completed ? "objective-task is-complete" : "objective-task"} key={task.id}>
                      <button className="task-check" type="button" onClick={() => toggleTask(task.id)}>
                        {task.completed && <CheckIcon width={16} height={16} />}
                      </button>
                      <div className="task-text">
                        <strong>{task.title}</strong>
                        <span>{formatTaskDate(task)}</span>
                      </div>
                    </article>
                  ))}

                  <div className="objective-add-row">
                    <button type="button" onClick={() => openComposer("sub", { objectiveId: objective.id })}>
                      Ajouter un sous-objectif
                    </button>
                    <button type="button" onClick={() => openComposer("task", { objectiveId: objective.id })}>
                      Ajouter une tâche
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {composer && (
        <div className="task-composer-layer" role="presentation">
          <form className="task-composer objectives-composer" onSubmit={submitComposer}>
            <button className="composer-close" type="button" aria-label="Fermer" onClick={() => setComposer(null)}>
              <XMarkIcon width={20} height={20} />
            </button>
            <div className="composer-fields">
              <label className="composer-field">
                <span>Nom</span>
                <input value={composer.title} onChange={(event) => setComposer({ ...composer, title: event.target.value })} placeholder="Objectif" />
              </label>
              {(composer.type === "objective" || composer.type === "edit-objective") && (
                <div className="color-picker" aria-label="Couleur">
                  {workColors.map((option) => (
                    <button
                      className={composer.color === option.value ? "color-swatch is-selected" : "color-swatch"}
                      type="button"
                      key={option.value}
                      aria-label={option.name}
                      style={{ background: option.value }}
                      onClick={() => setComposer({ ...composer, color: option.value })}
                    />
                  ))}
                </div>
              )}
            </div>
            <button className="create-task-button" type="submit">
              {composer.type.includes("edit") ? "Modifier" : "Créer"}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
