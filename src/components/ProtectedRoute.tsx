import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground font-body">Loading...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return children;
};

export default ProtectedRoute;
