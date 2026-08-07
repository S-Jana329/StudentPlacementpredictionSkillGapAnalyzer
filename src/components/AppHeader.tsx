import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/NotificationBell";

const baseLinks = [
  { to: "/", label: "Students" },
  { to: "/resume", label: "Resume Analyzer" },
  { to: "/interview", label: "Interview Coach" },
  { to: "/roadmap", label: "Career Roadmap" },
  { to: "/jobs", label: "Jobs" },
  { to: "/assistant", label: "Assistant" },
  { to: "/reports", label: "Reports" },
  { to: "/settings/email", label: "Email Settings" },
];

const AppHeader = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [open, setOpen] = useState(false);

  const links = isAdmin
    ? [
        ...baseLinks,
        { to: "/admin", label: "Admin" },
        { to: "/admin/job-matches", label: "Job Matches" },
        { to: "/admin/auth-log", label: "Auth Log" },
      ]
    : baseLinks;


  return (
    <header className="border-b border-border bg-card px-4 sm:px-6 py-3 relative">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <Link to="/" className="font-display text-base font-bold text-foreground truncate">
            Placement Predictor
          </Link>
          <nav className="hidden lg:flex items-center gap-4 flex-wrap">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`text-sm font-body ${
                  pathname === l.to ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <NotificationBell />
              <span className="text-xs font-body text-muted-foreground hidden xl:inline">{user.email}</span>
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={async () => { await signOut(); navigate("/auth"); }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => navigate("/auth")}>Sign in</Button>
          )}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
            className="lg:hidden inline-flex items-center justify-center rounded border border-border p-2 text-foreground"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="lg:hidden absolute inset-x-0 top-full z-40 bg-card border-b border-border shadow-md">
          <div className="flex flex-col py-2">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={`px-4 py-3 text-sm font-body border-b border-border last:border-b-0 ${
                  pathname === l.to ? "text-primary font-medium bg-muted/50" : "text-foreground"
                }`}
              >
                {l.label}
              </Link>
            ))}
            {user && (
              <button
                onClick={async () => { setOpen(false); await signOut(); navigate("/auth"); }}
                className="text-left px-4 py-3 text-sm font-body text-destructive border-t border-border"
              >
                Sign out ({user.email})
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};

export default AppHeader;
