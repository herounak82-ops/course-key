import { Link, NavLink } from "react-router-dom";
import logo from "@/assets/logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { HamburgerDrawer } from "./HamburgerDrawer";

const links = [
  { to: "/", label: "Home" },
  { to: "/courses", label: "Courses" },
  { to: "/my-learning", label: "My Learning" },
  { to: "/profile", label: "Profile" },
];

export const TopBar = () => {
  const { role } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white shadow-sm">
      <div className="container flex items-center justify-between gap-2 h-16 md:h-20 px-3 md:px-4">
        {/* Left: Hamburger + Logo */}
        <div className="flex items-center gap-2">
          <HamburgerDrawer />
          <Link to="/" className="flex items-center gap-2.5 hover-lift">
            <img
              src={logo}
              alt="Dev Study Point logo"
              className="h-12 w-12 md:h-14 md:w-14 object-contain drop-shadow-sm"
            />
            <div className="flex flex-col leading-tight">
              <span className="font-display font-extrabold text-lg md:text-xl text-primary tracking-tight">
                Dev Study Point
              </span>
              <span className="text-[9px] md:text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                by Dev Sharma
              </span>
            </div>
          </Link>
        </div>

        {/* Right: desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium transition-all tap-scale ${
                  isActive
                    ? "text-primary bg-secondary"
                    : "text-foreground/70 hover:text-foreground hover:bg-secondary"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
          {role === "admin" && (
            <Button asChild size="sm" variant="default" className="ml-2 shadow-card">
              <Link to="/admin">
                <Shield className="h-4 w-4 mr-1" /> Admin
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
};
