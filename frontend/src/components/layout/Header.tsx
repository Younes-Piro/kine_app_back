import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { usePermissions } from '@/hooks/usePermissions';
import { useAuthStore } from '@/store/authStore';

const PATH_TITLES: Array<{ pattern: RegExp; title: string }> = [
  { pattern: /^\/$/, title: 'Dashboard' },
  { pattern: /^\/clients$/, title: 'Clients' },
  { pattern: /^\/clients\/new$/, title: 'Create Client' },
  { pattern: /^\/clients\/\d+$/, title: 'Client Detail' },
  { pattern: /^\/clients\/\d+\/edit$/, title: 'Edit Client' },
  { pattern: /^\/users$/, title: 'Users' },
  { pattern: /^\/users\/new$/, title: 'Create User' },
  { pattern: /^\/users\/\d+\/permissions$/, title: 'User Permissions' },
  { pattern: /^\/treatments$/, title: 'Treatments' },
  { pattern: /^\/treatments\/\d+$/, title: 'Treatment Detail' },
  { pattern: /^\/sessions$/, title: 'Sessions' },
  { pattern: /^\/payments$/, title: 'Payments' },
  { pattern: /^\/invoices$/, title: 'Invoices' },
  { pattern: /^\/invoices\/new$/, title: 'Create Invoice' },
  { pattern: /^\/invoices\/\d+$/, title: 'Invoice Detail' },
  { pattern: /^\/activity-log$/, title: 'Activity Log' },
  { pattern: /^\/settings$/, title: 'Settings' },
];

function getTitle(pathname: string) {
  const match = PATH_TITLES.find((item) => item.pattern.test(pathname));
  return match?.title ?? 'KineApp';
}

export function Header() {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const { role } = usePermissions();

  const title = useMemo(() => getTitle(location.pathname), [location.pathname]);

  return (
    <header className="app-header">
      <div>
        <h1>{title}</h1>
        <p>{new Date().toLocaleDateString('en-GB')}</p>
      </div>
      <div className="header-user">
        <strong>{user?.username ?? 'Guest'}</strong>
        <span>{role ?? 'unknown role'}</span>
      </div>
    </header>
  );
}
