import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ isAllowed, children, redirectTo = "/acesso-negado" }) {
  const location = useLocation();

  if (!isAllowed) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }
  return children;
}