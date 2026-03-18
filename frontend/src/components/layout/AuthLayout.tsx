import { Activity, HeartPulse, Stethoscope } from 'lucide-react';
import type { PropsWithChildren } from 'react';

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="auth-shell">
      <div className="auth-illustration">
        <div className="auth-illustration-content">
          <div className="auth-brand">
            <div className="auth-brand-icon">
              <HeartPulse size={36} color="var(--color-primary-500)" />
            </div>
            <h2>KinéApp</h2>
          </div>
          <div className="auth-message">
            <h1>Empowering your physiotherapy practice.</h1>
            <p>Manage clients, treatments, and schedules with ease and precision.</p>
          </div>
          
          <div className="auth-graphics">
            <div className="graphic-circle circle-1">
              <Stethoscope size={28} />
            </div>
            <div className="graphic-circle circle-2">
              <Activity size={32} />
            </div>
          </div>
        </div>
        <div className="auth-glow" aria-hidden="true" />
      </div>
      <div className="auth-form-side">
        <main className="auth-card">{children}</main>
      </div>
    </div>
  );
}
