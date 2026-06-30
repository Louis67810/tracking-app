import React from "react";
import ReactDOM from "react-dom/client";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import AppShell from "./ui/AppShell.jsx";
import WorkPage from "./pages/WorkPage.jsx";
import WorkCalendarPage from "./pages/WorkCalendarPage.jsx";
import WorkTasksPage from "./pages/WorkTasksPage.jsx";
import WorkObjectivesPage from "./pages/WorkObjectivesPage.jsx";
import FocusPage from "./pages/FocusPage.jsx";
import EmptyPage from "./pages/EmptyPage.jsx";
import ScanPage from "./pages/ScanPage.jsx";
import { registerServiceWorker } from "./pwa.js";
import "./styles.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/travail" replace /> },
      { path: "accueil", element: <EmptyPage /> },
      { path: "focus", element: <FocusPage /> },
      { path: "statistiques", element: <EmptyPage /> },
      { path: "travail", element: <WorkPage /> },
      { path: "travail/calendrier", element: <WorkCalendarPage /> },
      { path: "travail/taches", element: <WorkTasksPage /> },
      { path: "travail/objectifs", element: <WorkObjectivesPage /> },
      { path: "recap", element: <EmptyPage /> },
      { path: "scan", element: <ScanPage /> }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

registerServiceWorker();
