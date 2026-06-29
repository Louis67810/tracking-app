import {
  BriefcaseIcon,
  ChartBarIcon,
  FireIcon,
  HomeIcon,
  IdentificationIcon
} from "@heroicons/react/24/outline";
import { NavLink } from "react-router-dom";

const items = [
  { to: "/accueil", label: "Accueil", icon: HomeIcon },
  { to: "/focus", label: "Focus", icon: FireIcon },
  { to: "/statistiques", label: "Statistiques", icon: ChartBarIcon },
  { to: "/travail", label: "Travail", icon: BriefcaseIcon },
  { to: "/recap", label: "Récap", icon: IdentificationIcon }
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className="nav-item">
          <span className="nav-glow" aria-hidden="true" />
          <Icon width={24} height={24} strokeWidth={2.45} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
