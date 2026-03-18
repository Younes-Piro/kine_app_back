import type { PropsWithChildren } from 'react';

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="auth-shell">
      <div className="auth-glow" aria-hidden="true" />
      <main className="auth-card">{children}</main>
    </div>
  );
}
