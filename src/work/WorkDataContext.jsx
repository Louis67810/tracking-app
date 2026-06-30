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
    hasDate: false
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

  const value = useMemo(
    () => ({ tasks, setTasks, createTask, updateTask, deleteTask, toggleTask, scheduleTask, colors: workColors }),
    [tasks]
  );

  return <WorkDataContext.Provider value={value}>{children}</WorkDataContext.Provider>;
}

export function useWorkData() {
  const value = useContext(WorkDataContext);
  if (!value) throw new Error("useWorkData must be used inside WorkDataProvider");
  return value;
}
