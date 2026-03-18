import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { usePermissions } from '@/hooks/usePermissions';
import { useAuthStore } from '@/store/authStore';

interface GuardProps {
  children: ReactNode;
}

interface ProtectedRouteProps extends GuardProps {
  permission?: string;
}

function toLoginRedirect(pathname: string, search: string) {
  const redirect = encodeURIComponent(`${pathname}${search}`);
  return `/login?redirect=${redirect}`;
}

export function ProtectedRoute({ children, permission }: ProtectedRouteProps) {
  const location = useLocation();
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const { role, hasPermission } = usePermissions();

  if (!accessToken && !refreshToken) {
    return <Navigate to={toLoginRedirect(location.pathname, location.search)} replace />;
  }

  if (!permission) {
    return <>{children}</>;
  }

  if (!role) {
    return <p>Checking permissions...</p>;
  }

  if (!hasPermission(permission)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}

export function AdminRoute({ children }: GuardProps) {
  const location = useLocation();
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const { role } = usePermissions();

  if (!accessToken && !refreshToken) {
    return <Navigate to={toLoginRedirect(location.pathname, location.search)} replace />;
  }

  if (!role) {
    return <p>Checking permissions...</p>;
  }

  if (role !== 'admin') {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
