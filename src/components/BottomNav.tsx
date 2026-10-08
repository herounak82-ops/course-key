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
      <ul className={cn("grid max-w-screen-sm mx-auto", nav.length === 5 ? "grid-cols-5" : "grid-cols-4")}>
        {nav.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors min-h-[52px]",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              <Icon className="h-6 w-6" strokeWidth={2.2} />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};
