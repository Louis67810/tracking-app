import { BarChart3, BriefcaseBusiness, ContactRound, Flame, Home } from "lucide-react";
import { NavLink } from "react-router-dom";

const items = [
  { to: "/accueil", label: "Accueil", icon: Home },
  { to: "/focus", label: "Focus", icon: Flame },
  { to: "/statistiques", label: "Statistiques", icon: BarChart3 },
  { to: "/travail", label: "Travail", icon: BriefcaseBusiness },
  { to: "/recap", label: "Récap", icon: ContactRound }
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className="nav-item">
          <span className="nav-glow" aria-hidden="true" />
          <Icon size={24} strokeWidth={2.8} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
