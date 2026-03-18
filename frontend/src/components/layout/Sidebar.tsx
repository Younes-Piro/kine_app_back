import {
  Home,
  Users,
  UserRound,
  Wallet,
  FileText,
  CalendarDays,
  Stethoscope,
  Settings,
  Clock3,
  LogOut,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { useLogout } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuthStore } from '@/store/authStore';

interface NavigationItem {
  label: string;
  to: string;
  icon: typeof Home;
  permission?: string;
  adminOnly?: boolean;
}

const navItems: NavigationItem[] = [
  { label: 'Dashboard', to: '/', icon: Home },
  { label: 'Clients', to: '/clients', icon: UserRound, permission: 'client:view' },
  { label: 'Treatments', to: '/treatments', icon: Stethoscope, permission: 'treatment:view' },
  { label: 'Sessions', to: '/sessions', icon: CalendarDays, permission: 'session:view' },
  { label: 'Payments', to: '/payments', icon: Wallet, permission: 'payment:view' },
  { label: 'Invoices', to: '/invoices', icon: FileText, permission: 'invoice:view' },
  { label: 'Users', to: '/users', icon: Users, adminOnly: true },
  { label: 'Activity Log', to: '/activity-log', icon: Clock3, adminOnly: true },
  { label: 'Settings', to: '/settings', icon: Settings, adminOnly: true },
];

export function Sidebar() {
  const { hasPermission, isAdmin } = usePermissions();
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogout();

  const visibleItems = navItems.filter((item) => {
    if (item.adminOnly) {
      return isAdmin;
    }

    if (!item.permission) {
      return true;
    }

    return hasPermission(item.permission);
  });

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-brand">
          <h2>KineApp</h2>
          <p>Clinic Manager</p>
        </div>

        <nav className="sidebar-nav">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
                end={item.to === '/'}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <strong>{user?.username}</strong>
          <span>{user?.email}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="sidebar-logout"
          isLoading={logoutMutation.isPending}
          onClick={() => logoutMutation.mutate()}
        >
          <LogOut size={16} />
          Logout
        </Button>
      </div>
    </aside>
  );
}
