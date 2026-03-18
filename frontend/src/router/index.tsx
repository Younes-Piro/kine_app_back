import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

import { AppLayout } from '@/components/layout/AppLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { ForbiddenPage } from '@/features/auth/ForbiddenPage';
import { ActivityLogPage } from '@/features/activity-log/ActivityLogPage';
import { ClientCreatePage } from '@/features/clients/ClientCreatePage';
import { ClientDetailPage } from '@/features/clients/ClientDetailPage';
import { ClientEditPage } from '@/features/clients/ClientEditPage';
import { ClientListPage } from '@/features/clients/ClientListPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { InvoiceCreatePage } from '@/features/invoices/InvoiceCreatePage';
import { InvoiceDetailPage } from '@/features/invoices/InvoiceDetailPage';
import { InvoiceListPage } from '@/features/invoices/InvoiceListPage';
import { PaymentListPage } from '@/features/payments/PaymentListPage';
import { SessionCalendarPage } from '@/features/sessions/SessionCalendarPage';
import { SessionListPage } from '@/features/sessions/SessionListPage';
import { SettingsDashboardPage } from '@/features/settings/SettingsDashboardPage';
import { TreatmentDetailPage } from '@/features/treatments/TreatmentDetailPage';
import { TreatmentListPage } from '@/features/treatments/TreatmentListPage';
import { UserCreatePage } from '@/features/users/UserCreatePage';
import { UserListPage } from '@/features/users/UserListPage';
import { UserPermissionsPage } from '@/features/users/UserPermissionsPage';
import { useAuthBootstrap } from '@/hooks/useAuth';

import { AdminRoute, ProtectedRoute } from './guards';

export function AppRouter() {
  const { isBootstrapping } = useAuthBootstrap();

  if (isBootstrapping) {
    return <div className="screen-loader">Restoring session...</div>;
  }

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          }
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />

          <Route
            path="clients"
            element={
              <ProtectedRoute permission="client:view">
                <ClientListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="clients/new"
            element={
              <ProtectedRoute permission="client:create">
                <ClientCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="clients/:id"
            element={
              <ProtectedRoute permission="client:view">
                <ClientDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="clients/:id/edit"
            element={
              <ProtectedRoute permission="client:update">
                <ClientEditPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="users"
            element={
              <AdminRoute>
                <UserListPage />
              </AdminRoute>
            }
          />
          <Route
            path="users/new"
            element={
              <AdminRoute>
                <UserCreatePage />
              </AdminRoute>
            }
          />
          <Route
            path="users/:id/permissions"
            element={
              <AdminRoute>
                <UserPermissionsPage />
              </AdminRoute>
            }
          />

          <Route
            path="treatments"
            element={
              <ProtectedRoute permission="treatment:view">
                <TreatmentListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="treatments/:id"
            element={
              <ProtectedRoute permission="treatment:view">
                <TreatmentDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="sessions"
            element={
              <ProtectedRoute permission="session:view">
                <SessionListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="sessions_calendar"
            element={
              <ProtectedRoute permission="session:view">
                <SessionCalendarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="payments"
            element={
              <ProtectedRoute permission="payment:view">
                <PaymentListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="invoices"
            element={
              <ProtectedRoute permission="invoice:view">
                <InvoiceListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="invoices/new"
            element={
              <ProtectedRoute permission="invoice:create">
                <InvoiceCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="invoices/:id"
            element={
              <ProtectedRoute permission="invoice:view">
                <InvoiceDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="settings"
            element={
              <AdminRoute>
                <SettingsDashboardPage />
              </AdminRoute>
            }
          />
          <Route
            path="activity-log"
            element={
              <AdminRoute>
                <ActivityLogPage />
              </AdminRoute>
            }
          />

          <Route path="403" element={<ForbiddenPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster richColors position="top-right" />
    </>
  );
}
