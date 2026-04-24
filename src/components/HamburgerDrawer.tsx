import { Link, useLocation } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  Menu,
  Home,
  BookOpen,
  GraduationCap,
  User,
  Shield,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import logo from "@/assets/logo.png";

const baseLinks = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/courses", label: "All Courses", icon: BookOpen },
  { to: "/my-learning", label: "My Learning", icon: GraduationCap },
  { to: "/profile", label: "Profile", icon: User },
];

export const HamburgerDrawer = () => {
  const { role, signOut } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const links = role === "admin"
    ? [...baseLinks, { to: "/admin", label: "Admin", icon: Shield, end: false as boolean | undefined }]
    : baseLinks;

  const isActive = (to: string, end?: boolean) =>
    end ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          className="hover:bg-secondary"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[290px] p-0 flex flex-col">
        <SheetHeader className="p-5 border-b bg-hero text-primary-foreground">
          <SheetTitle className="text-primary-foreground flex items-center gap-3">
            <img
              src={logo}
              alt=""
              className="h-10 w-10 rounded-xl bg-white p-1 shadow-elevated"
            />
            <span className="font-display font-extrabold text-lg leading-tight">
              Dev Study Point
              <span className="block text-[10px] font-medium uppercase tracking-wider opacity-80">
                by Dev Sharma
              </span>
            </span>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {links.map(({ to, label, icon: Icon, end }) => {
              const active = isActive(to, end as boolean);
              return (
                <li key={to}>
                  <Link
                    to={to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all tap-scale",
                      active
                        ? "bg-primary text-primary-foreground shadow-card"
                        : "text-foreground hover:bg-secondary"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-3 border-t">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
            onClick={async () => {
              setOpen(false);
              await signOut();
            }}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
          <p className="text-center text-[10px] text-muted-foreground mt-3">
            © {new Date().getFullYear()} Dev Study Point
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};
