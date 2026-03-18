import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';

import { queryKeys } from '@/api/queryKeys';
import { usersApi } from '@/api/users';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/lib/http';
import type { User } from '@/types/api';

interface UserEditDialogProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
}

const userEditSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  email: z.string().email('Invalid email'),
  role: z.enum(['admin', 'staff']),
  is_active: z.boolean(),
});

type UserEditValues = z.infer<typeof userEditSchema>;

export function UserEditDialog({ user, open, onClose }: UserEditDialogProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<UserEditValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      username: '',
      email: '',
      role: 'staff',
      is_active: true,
    },
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    reset({
      username: user.username,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
    });
  }, [reset, user]);

  const updateMutation = useMutation({
    mutationFn: (payload: UserEditValues) => {
      if (!user) {
        return Promise.reject(new Error('No user selected'));
      }

      return usersApi.update(user.id, payload);
    },
    onSuccess: () => {
      toast.success('User updated');
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      onClose();
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to update user'));
    },
  });

  const onSubmit = (values: UserEditValues) => {
    updateMutation.mutate(values);
  };

  return (
    <Modal
      open={open}
      title={user ? `Edit ${user.username}` : 'Edit user'}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="user-edit-form" isLoading={updateMutation.isPending}>
            Save changes
          </Button>
        </>
      }
    >
      <form id="user-edit-form" className="stack" onSubmit={handleSubmit(onSubmit)}>
        <Input label="Username" {...register('username')} error={errors.username?.message} />
        <Input label="Email" {...register('email')} error={errors.email?.message} />

        <div className="field">
          <label>Role</label>
          <select
            className="input"
            {...register('role')}
            onChange={(event) => setValue('role', event.target.value as 'admin' | 'staff')}
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
          {errors.role ? <p className="field-error">{errors.role.message}</p> : null}
        </div>

        <label className="checkbox-row">
          <input type="checkbox" {...register('is_active')} />
          <span>User active</span>
        </label>
      </form>
    </Modal>
  );
}
