import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth(); const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}
export function VerifiedRoute() {
  const { user } = useAuth();
  if (!user?.emailVerified) return <Navigate to="/verify-required" replace />;
  return <Outlet />;
}
export function RoleRoute({ roles }) {
  const { user } = useAuth();
  if (!roles.includes(user?.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
