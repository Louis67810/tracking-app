import { Outlet, useLocation } from "react-router-dom";
import BottomNav from "./BottomNav.jsx";

export default function AppShell() {
  const location = useLocation();
  const isScan = location.pathname === "/scan";

  return (
    <main className="app-frame">
      <Outlet />
      {!isScan && <BottomNav />}
    </main>
  );
}
