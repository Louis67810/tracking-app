import { createContext, useContext, useMemo, useState } from "react";

export const workColors = [
  { name: "Bleu", value: "#8BE2FF", glow: "139, 226, 255" },
  { name: "Orange", value: "#FFC98B", glow: "255, 201, 139" },
  { name: "Rouge", value: "#FF8B8D", glow: "255, 139, 141" },
  { name: "Vert", value: "#9BE7C4", glow: "155, 231, 196" },
  { name: "Violet", value: "#A48BFF", glow: "164, 139, 255" },
  { name: "Menthe", value: "#8BFFE8", glow: "139, 255, 232" }
];

const initialTasks = [
  {
    id: "task-1",
    title: "Temps d'ecran moyen",
    dayOffset: 0,
    start: 6.5,
    duration: 1.75,
    completed: false,
    color: workColors[0],
    objectiveId: "goal-1",
    subObjectiveId: "sub-1",
    hasDate: true
  },
  {
    id: "task-2",
    title: "Temps d'ecran moyen",
    dayOffset: 0,
    start: 8.5,
    duration: 1.75,
    completed: true,
    color: workColors[1],
    objectiveId: "goal-1",
    subObjectiveId: "sub-1",
    hasDate: true
  },
  {
    id: "task-3",
    title: "Temps d'ecran moyen",
    dayOffset: 0,
    start: 10.5,
    duration: 1.75,
    completed: true,
    color: workColors[2],
    objectiveId: "goal-1",
    subObjectiveId: null,
    hasDate: true
  },
  {
    id: "task-4",
    title: "Temps d'ecran moyen",
    dayOffset: null,
    start: null,
    duration: 1,
    completed: false,
    color: workColors[5],
    objectiveId: null,
    subObjectiveId: null,
    hasDate: false
  }
];

const initialObjectives = [
  {
    id: "goal-1",
    title: "Temps d'ecran moyen",
    color: workColors[2],
    expanded: true,
    subObjectives: [
      { id: "sub-1", title: "Routine du matin", expanded: true }
    ]
  },
  {
    id: "goal-2",
    title: "Planifier la semaine",
    color: workColors[3],
    expanded: false,
    subObjectives: []
  }
];

const WorkDataContext = createContext(null);

export function timeToStart(value) {
  const [hour, minutes] = value.split(":").map(Number);
  return hour + minutes / 60;
}

export function startToTime(start) {
  if (start === null || start === undefined) return "";
  const hour = Math.floor(start);
  const minutes = Math.round((start - hour) * 60);
  return `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function durationFromParts(hours, minutes) {
  return Math.max(1 / 60, Number(hours || 0) + Number(minutes || 0) / 60);
}

export function clampTaskStart(start, duration) {
  return Math.max(0, Math.min(24 - duration, start));
}

export function findWorkColor(value) {
  return workColors.find((option) => option.value === value) ?? workColors[0];
}

export function WorkDataProvider({ children }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [objectives, setObjectives] = useState(initialObjectives);

  function createTask(input) {
    const color = typeof input.color === "string" ? findWorkColor(input.color) : input.color ?? workColors[0];
    const task = {
      id: crypto.randomUUID?.() ?? `task-${Date.now()}`,
      title: input.title?.trim() || "Nouvelle tache",
      hasDate: Boolean(input.hasDate),
      dayOffset: input.hasDate ? Number(input.dayOffset ?? 0) : null,
      start: input.hasDate ? clampTaskStart(Number(input.start ?? 12), Number(input.duration ?? 1)) : null,
      duration: Number(input.duration ?? 1),
      completed: false,
      color
    };
    setTasks((current) => [...current, task]);
    return task;
  }

  function updateTask(taskId, patch) {
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) return task;
        const color = patch.color
          ? typeof patch.color === "string"
            ? findWorkColor(patch.color)
            : patch.color
          : task.color;
        const duration = patch.duration !== undefined ? Number(patch.duration) : task.duration;
        const nextStart =
          patch.start !== undefined && patch.start !== null ? clampTaskStart(Number(patch.start), duration) : patch.start;

        return {
          ...task,
          ...patch,
          color,
          duration,
          start: nextStart !== undefined ? nextStart : task.start,
          dayOffset: patch.hasDate === false ? null : patch.dayOffset !== undefined ? Number(patch.dayOffset) : task.dayOffset
        };
      })
    );
  }

  function deleteTask(taskId) {
    setTasks((current) => current.filter((task) => task.id !== taskId));
  }

  function toggleTask(taskId) {
    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task))
    );
  }

  function scheduleTask(taskId, input) {
    updateTask(taskId, {
      hasDate: true,
      dayOffset: Number(input.dayOffset),
      start: input.start,
      duration: input.duration
    });
  }

  function createObjective(input) {
    const objective = {
      id: crypto.randomUUID?.() ?? `goal-${Date.now()}`,
      title: input.title?.trim() || "Nouvel objectif",
      color: typeof input.color === "string" ? findWorkColor(input.color) : input.color ?? workColors[0],
      expanded: true,
      subObjectives: []
    };
    setObjectives((current) => [...current, objective]);
    return objective;
  }

  function updateObjective(objectiveId, patch) {
    setObjectives((current) =>
      current.map((objective) => {
        if (objective.id !== objectiveId) return objective;
        const color = patch.color
          ? typeof patch.color === "string"
            ? findWorkColor(patch.color)
            : patch.color
          : objective.color;
        return { ...objective, ...patch, color };
      })
    );
  }

  function deleteObjective(objectiveId) {
    setObjectives((current) => current.filter((objective) => objective.id !== objectiveId));
    setTasks((current) =>
      current.map((task) =>
        task.objectiveId === objectiveId ? { ...task, objectiveId: null, subObjectiveId: null } : task
      )
    );
  }

  function createSubObjective(objectiveId, input) {
    const subObjective = {
      id: crypto.randomUUID?.() ?? `sub-${Date.now()}`,
      title: input.title?.trim() || "Sous-objectif",
      expanded: true
    };
    setObjectives((current) =>
      current.map((objective) =>
        objective.id === objectiveId
          ? { ...objective, expanded: true, subObjectives: [...objective.subObjectives, subObjective] }
          : objective
      )
    );
    return subObjective;
  }

  function updateSubObjective(objectiveId, subObjectiveId, patch) {
    setObjectives((current) =>
      current.map((objective) =>
        objective.id === objectiveId
          ? {
              ...objective,
              subObjectives: objective.subObjectives.map((subObjective) =>
                subObjective.id === subObjectiveId ? { ...subObjective, ...patch } : subObjective
              )
            }
          : objective
      )
    );
  }

  function deleteSubObjective(objectiveId, subObjectiveId) {
    setObjectives((current) =>
      current.map((objective) =>
        objective.id === objectiveId
          ? { ...objective, subObjectives: objective.subObjectives.filter((subObjective) => subObjective.id !== subObjectiveId) }
          : objective
      )
    );
    setTasks((current) =>
      current.map((task) => (task.subObjectiveId === subObjectiveId ? { ...task, subObjectiveId: null } : task))
    );
  }

  function linkTaskToObjective(taskId, objectiveId, subObjectiveId = null) {
    updateTask(taskId, { objectiveId, subObjectiveId });
  }

  const value = useMemo(
    () => ({
      tasks,
      objectives,
      setTasks,
      createTask,
      updateTask,
      deleteTask,
      toggleTask,
      scheduleTask,
      createObjective,
      updateObjective,
      deleteObjective,
      createSubObjective,
      updateSubObjective,
      deleteSubObjective,
      linkTaskToObjective,
      colors: workColors
    }),
    [tasks, objectives]
  );

  return <WorkDataContext.Provider value={value}>{children}</WorkDataContext.Provider>;
}

export function useWorkData() {
  const value = useContext(WorkDataContext);
  if (!value) throw new Error("useWorkData must be used inside WorkDataProvider");
  return value;
}
