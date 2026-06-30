import { Outlet, useLocation } from "react-router-dom";
import BottomNav from "./BottomNav.jsx";
import { WorkDataProvider } from "../work/WorkDataContext.jsx";

export default function AppShell() {
  const location = useLocation();
  const isScan = location.pathname === "/scan";

  return (
    <main className="app-frame">
      <WorkDataProvider>
        <Outlet />
      </WorkDataProvider>
      {!isScan && <BottomNav />}
    </main>
  );
}
