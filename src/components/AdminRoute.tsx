import { Navigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const { isAdmin, loading } = useIsAdmin();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground font-body">Checking permissions...</p>
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
};

export default AdminRoute;
