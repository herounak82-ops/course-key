import { NavLink } from "react-router-dom";
import { Home, BookOpen, GraduationCap, User, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/courses", label: "Courses", icon: BookOpen },
  { to: "/my-learning", label: "Learning", icon: GraduationCap },
  { to: "/profile", label: "Profile", icon: User },
];

export const BottomNav = () => {
  const { role } = useAuth();
  const nav = role === "admin" ? [...items, { to: "/admin", label: "Admin", icon: Shield }] : items;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur safe-bottom md:hidden">
      <ul className="grid grid-cols-5 max-w-screen-sm mx-auto">
        {nav.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors min-h-[52px]",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};
