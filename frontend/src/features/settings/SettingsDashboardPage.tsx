import { useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { usePermissions } from '@/hooks/usePermissions';

import { AppOptionSection } from './AppOptionSection';
import { ClosedDaySection } from './ClosedDaySection';
import { ClosureRangeSection } from './ClosureRangeSection';
import { HolidaySection } from './HolidaySection';

type SettingsTab = 'options' | 'holidays' | 'closed-days' | 'closure-ranges';

const SETTINGS_TABS: Array<{ value: SettingsTab; label: string }> = [
  { value: 'options', label: 'App Options' },
  { value: 'holidays', label: 'Holidays' },
  { value: 'closed-days', label: 'Closed Days' },
  { value: 'closure-ranges', label: 'Closure Ranges' },
];

export function SettingsDashboardPage() {
  const { hasPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState<SettingsTab>('options');

  const canView = hasPermission('settings:view');
  const canUpdate = hasPermission('settings:update');
  const canDelete = hasPermission('settings:delete');

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardBody>
          <p>You do not have permission to view settings.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="card-header-between">
        <div>
          <CardTitle>Settings</CardTitle>
          <p>Manage app options, holidays, closed days, and closure ranges.</p>
        </div>
      </CardHeader>

      <CardBody>
        <div className="tabs-row">
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={activeTab === tab.value ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'options' ? <AppOptionSection canUpdate={canUpdate} canDelete={canDelete} /> : null}
        {activeTab === 'holidays' ? <HolidaySection canUpdate={canUpdate} canDelete={canDelete} /> : null}
        {activeTab === 'closed-days' ? <ClosedDaySection canUpdate={canUpdate} canDelete={canDelete} /> : null}
        {activeTab === 'closure-ranges' ? (
          <ClosureRangeSection canUpdate={canUpdate} canDelete={canDelete} />
        ) : null}
      </CardBody>
    </Card>
  );
}
