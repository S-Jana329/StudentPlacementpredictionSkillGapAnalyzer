import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/", label: "Students" },
  { to: "/resume", label: "Resume Analyzer" },
  { to: "/interview", label: "Interview Coach" },
  { to: "/roadmap", label: "Career Roadmap" },
  { to: "/assistant", label: "Assistant" },
  { to: "/reports", label: "Reports" },
];

const AppHeader = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <header className="border-b border-border bg-card px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link to="/" className="font-display text-base font-bold text-foreground">
          Placement Predictor
        </Link>
        <nav className="flex items-center gap-4">
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
      <div className="flex items-center gap-3">
        {user ? (
          <>
            <span className="text-xs font-body text-muted-foreground hidden sm:inline">{user.email}</span>
            <Button variant="outline" size="sm" onClick={async () => { await signOut(); navigate("/auth"); }}>
              Sign out
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={() => navigate("/auth")}>Sign in</Button>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
