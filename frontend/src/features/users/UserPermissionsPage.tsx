import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { permissionsApi } from '@/api/permissions';
import { queryKeys } from '@/api/queryKeys';
import { usersApi } from '@/api/users';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { getApiErrorMessage } from '@/lib/http';
import { useAuthStore } from '@/store/authStore';
import { usePermissionsStore } from '@/store/permissionsStore';
import type { Permission } from '@/types/api';

const MODULE_LABELS: Record<string, string> = {
  client: 'Clients',
  treatment: 'Treatments',
  session: 'Sessions',
  payment: 'Payments',
  invoice: 'Invoices',
  settings: 'Settings',
  user: 'Users',
};

const MODULE_ORDER = ['client', 'treatment', 'session', 'payment', 'invoice', 'settings', 'user'];

function getModuleCode(permissionCode: string) {
  return permissionCode.split(':')[0] || 'other';
}

function getModuleLabel(moduleCode: string) {
  const knownLabel = MODULE_LABELS[moduleCode];
  if (knownLabel) {
    return knownLabel;
  }

  return moduleCode.charAt(0).toUpperCase() + moduleCode.slice(1);
}

function areSameIdList(a: number[], b: number[]) {
  if (a.length !== b.length) {
    return false;
  }

  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) {
      return false;
    }
  }

  return true;
}

export function UserPermissionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = useParams<{ id: string }>();
  const userId = Number(params.id);
  const isValidUserId = Number.isFinite(userId) && userId > 0;
  const currentUser = useAuthStore((state) => state.user);
  const setMyPermissions = usePermissionsStore((state) => state.setFromResponse);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);

  const catalogQuery = useQuery({
    queryKey: queryKeys.permissions.catalog,
    queryFn: permissionsApi.catalog,
    enabled: isValidUserId,
  });

  const userPermissionsQuery = useQuery({
    queryKey: queryKeys.permissions.user(userId),
    queryFn: () => permissionsApi.getUserPermissions(userId),
    enabled: isValidUserId,
  });

  const userDetailQuery = useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => usersApi.detail(userId),
    enabled: isValidUserId,
  });

  useEffect(() => {
    const permissions = userPermissionsQuery.data?.permissions;
    if (!permissions || permissions === 'all') {
      setSelectedPermissionIds([]);
      return;
    }

    setSelectedPermissionIds(permissions.map((permission) => permission.id));
  }, [userPermissionsQuery.data]);

  const groupedPermissions = useMemo(() => {
    const grouped = new Map<string, Permission[]>();

    for (const permission of catalogQuery.data ?? []) {
      const moduleCode = getModuleCode(permission.code);
      const list = grouped.get(moduleCode) ?? [];
      list.push(permission);
      grouped.set(moduleCode, list);
    }

    return Array.from(grouped.entries())
      .map(([moduleCode, permissions]) => ({
        moduleCode,
        moduleLabel: getModuleLabel(moduleCode),
        permissions: [...permissions].sort((left, right) => left.label.localeCompare(right.label)),
      }))
      .sort((left, right) => {
        const leftOrder = MODULE_ORDER.indexOf(left.moduleCode);
        const rightOrder = MODULE_ORDER.indexOf(right.moduleCode);
        const normalizedLeftOrder = leftOrder === -1 ? Number.MAX_SAFE_INTEGER : leftOrder;
        const normalizedRightOrder = rightOrder === -1 ? Number.MAX_SAFE_INTEGER : rightOrder;

        if (normalizedLeftOrder !== normalizedRightOrder) {
          return normalizedLeftOrder - normalizedRightOrder;
        }

        return left.moduleLabel.localeCompare(right.moduleLabel);
      });
  }, [catalogQuery.data]);

  const initialPermissionIds = useMemo(() => {
    const permissions = userPermissionsQuery.data?.permissions;
    if (!permissions || permissions === 'all') {
      return [];
    }

    return permissions
      .map((permission) => permission.id)
      .sort((left, right) => left - right);
  }, [userPermissionsQuery.data]);

  const sortedSelectedPermissionIds = useMemo(
    () => [...selectedPermissionIds].sort((left, right) => left - right),
    [selectedPermissionIds],
  );

  const hasChanges = !areSameIdList(sortedSelectedPermissionIds, initialPermissionIds);

  const syncCurrentUserPermissions = async () => {
    if (currentUser?.id !== userId) {
      return;
    }

    try {
      const mePermissions = await permissionsApi.me();
      setMyPermissions(mePermissions);
      queryClient.setQueryData(queryKeys.permissions.me, mePermissions);
    } catch {
      // Ignore sync failures; permissions page still has latest user-specific state.
    }
  };

  const assignMutation = useMutation({
    mutationFn: () =>
      permissionsApi.assignUserPermissions(userId, {
        permission_ids: sortedSelectedPermissionIds,
      }),
    onSuccess: async () => {
      toast.success('Permissions updated');
      await queryClient.invalidateQueries({ queryKey: queryKeys.permissions.user(userId) });
      void syncCurrentUserPermissions();
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to update permissions'));
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => permissionsApi.clearUserPermissions(userId),
    onSuccess: async () => {
      setIsClearDialogOpen(false);
      setSelectedPermissionIds([]);
      toast.success('Permissions cleared');
      await queryClient.invalidateQueries({ queryKey: queryKeys.permissions.user(userId) });
      void syncCurrentUserPermissions();
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to clear permissions'));
    },
  });

  const isBusy = assignMutation.isPending || clearMutation.isPending;

  const togglePermission = (permissionId: number) => {
    setSelectedPermissionIds((current) => {
      if (current.includes(permissionId)) {
        return current.filter((id) => id !== permissionId);
      }

      return [...current, permissionId];
    });
  };

  if (!isValidUserId) {
    return <p>Invalid user id.</p>;
  }

  if (catalogQuery.isLoading || userPermissionsQuery.isLoading || userDetailQuery.isLoading) {
    return <p>Loading user permissions...</p>;
  }

  if (catalogQuery.isError || userPermissionsQuery.isError || !userPermissionsQuery.data) {
    return <p>Failed to load user permissions.</p>;
  }

  const targetUserName = userDetailQuery.data?.username ?? `User #${userId}`;
  const targetUserEmail = userDetailQuery.data?.email;
  const isAdminUser = userPermissionsQuery.data.role === 'admin';

  return (
    <>
      <Card>
        <CardHeader className="card-header-between">
          <div>
            <CardTitle>User Permissions</CardTitle>
            <p>
              {targetUserName}
              {targetUserEmail ? ` - ${targetUserEmail}` : ''}
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={() => navigate('/users')}>
            Back to users
          </Button>
        </CardHeader>

        <CardBody>
          {isAdminUser ? (
            <div className="stack">
              <p className="help-text">Role: admin</p>
              <p>Admin users have all permissions. Assignment is not required.</p>
            </div>
          ) : (
            <div className="stack">
              <div className="permissions-summary">
                <p className="help-text">Role: staff</p>
                <p className="help-text">{selectedPermissionIds.length} permissions selected</p>
              </div>

              <div className="detail-grid">
                {groupedPermissions.map((group) => (
                  <section key={group.moduleCode} className="metric-card permissions-module-card">
                    <h4>{group.moduleLabel}</h4>
                    <div className="permissions-module-list">
                      {group.permissions.map((permission) => (
                        <label key={permission.id} className="permission-option">
                          <input
                            type="checkbox"
                            checked={selectedPermissionIds.includes(permission.id)}
                            onChange={() => togglePermission(permission.id)}
                            disabled={isBusy}
                          />
                          <span>
                            {permission.label}

                          </span>
                        </label>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <div className="actions-row">
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => setIsClearDialogOpen(true)}
                  disabled={isBusy || initialPermissionIds.length === 0}
                >
                  Clear All
                </Button>
                <Button
                  type="button"
                  onClick={() => assignMutation.mutate()}
                  isLoading={assignMutation.isPending}
                  disabled={!hasChanges || isBusy}
                >
                  Save Permissions
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={isClearDialogOpen}
        title="Clear all permissions"
        message={`Remove all assigned permissions for ${targetUserName}?`}
        confirmText="Clear all"
        isLoading={clearMutation.isPending}
        onCancel={() => setIsClearDialogOpen(false)}
        onConfirm={() => clearMutation.mutate()}
      />
    </>
  );
}
