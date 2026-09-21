import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore.js";

interface PermissionGuardProps {
  roles?: string[];
  children: ReactNode;
}

export default function PermissionGuard({ roles = [], children }: PermissionGuardProps) {
  const { user } = useAuthStore();
  const canAccess = user?.role ? roles.includes(user.role) : false;

  if (!canAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
