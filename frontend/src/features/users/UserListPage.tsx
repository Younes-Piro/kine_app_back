import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { queryKeys } from '@/api/queryKeys';
import { usersApi } from '@/api/users';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Table, type TableColumn } from '@/components/ui/Table';
import { getApiErrorMessage } from '@/lib/http';
import type { User } from '@/types/api';

import { UserEditDialog } from './UserEditDialog';

export function UserListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deactivateUser, setDeactivateUser] = useState<User | null>(null);

  const usersQuery = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: usersApi.list,
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => usersApi.deactivate(id),
    onSuccess: () => {
      toast.success('User deactivated');
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      setDeactivateUser(null);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to deactivate user'));
    },
  });

  const filteredUsers = useMemo(() => {
    const items = usersQuery.data ?? [];
    if (!search.trim()) {
      return items;
    }

    const normalized = search.toLowerCase();
    return items.filter(
      (user) =>
        user.username.toLowerCase().includes(normalized) ||
        user.email.toLowerCase().includes(normalized),
    );
  }, [search, usersQuery.data]);

  const columns: Array<TableColumn<User>> = [
    {
      header: 'Username',
      render: (user) => user.username,
    },
    {
      header: 'Email',
      render: (user) => user.email,
    },
    {
      header: 'Role',
      render: (user) => (
        <Badge variant={user.role === 'admin' ? 'info' : 'neutral'}>{user.role}</Badge>
      ),
    },
    {
      header: 'User Status',
      render: (user) => (
        <Badge variant={user.is_active ? 'success' : 'danger'}>
          {user.is_active ? 'active' : 'inactive'}
        </Badge>
      ),
    },
    {
      header: 'Profile Status',
      render: (user) => (
        <Badge variant={user.profile_active ? 'success' : 'danger'}>
          {user.profile_active ? 'active' : 'inactive'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      render: (user) => (
        <div className="actions-inline" onClick={(event) => event.stopPropagation()}>
          <Button type="button" size="sm" variant="secondary" onClick={() => setEditingUser(user)}>
            Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant="danger"
            onClick={() => setDeactivateUser(user)}
            disabled={!user.is_active}
          >
            Deactivate
          </Button>
          <Link className="link-btn" to={`/users/${user.id}/permissions`}>
            Permissions
          </Link>
        </div>
      ),
    },
  ];

  return (
    <>
      <Card>
        <CardHeader className="card-header-between">
          <CardTitle>Users</CardTitle>
          <Button type="button" onClick={() => navigate("/users/new")}>
            New User
          </Button>
        </CardHeader>
        <CardBody>
          <div className="toolbar">
            <Input
              placeholder="Search username or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {usersQuery.isLoading ? <p>Loading users...</p> : null}

          {usersQuery.isError ? <p>Failed to load users.</p> : null}

          {!usersQuery.isLoading && !usersQuery.isError ? (
            <Table
              columns={columns}
              data={filteredUsers}
              getRowKey={(user) => user.id}
              emptyMessage="No users found."
            />
          ) : null}
        </CardBody>
      </Card>

      <UserEditDialog
        open={Boolean(editingUser)}
        user={editingUser}
        onClose={() => setEditingUser(null)}
      />

      <ConfirmDialog
        open={Boolean(deactivateUser)}
        title="Deactivate user"
        message={`Deactivate ${deactivateUser?.username}? This will disable the linked profile too.`}
        confirmText="Deactivate"
        isLoading={deactivateMutation.isPending}
        onCancel={() => setDeactivateUser(null)}
        onConfirm={() => {
          if (deactivateUser) {
            deactivateMutation.mutate(deactivateUser.id);
          }
        }}
      />
    </>
  );
}
