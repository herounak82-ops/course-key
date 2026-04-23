import { Link, NavLink } from "react-router-dom";
import logo from "@/assets/logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

const links = [
  { to: "/", label: "Home" },
  { to: "/courses", label: "Courses" },
  { to: "/my-learning", label: "My Learning" },
  { to: "/profile", label: "Profile" },
];

export const TopBar = () => {
  const { role } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="container flex items-center justify-between gap-4 h-14 md:h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Dev Study Point logo" className="h-9 w-9 object-contain" />
          <div className="hidden sm:block">
            <p className="font-display font-extrabold text-base leading-none text-primary">Dev Study Point</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">by Dev Sharma</p>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive ? "text-primary bg-secondary" : "text-foreground/70 hover:text-foreground hover:bg-secondary"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
          {role === "admin" && (
            <Button asChild size="sm" variant="default" className="ml-2">
              <Link to="/admin"><Shield className="h-4 w-4 mr-1" /> Admin</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
};
