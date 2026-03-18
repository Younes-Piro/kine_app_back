import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { queryKeys } from '@/api/queryKeys';
import { usersApi } from '@/api/users';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { getApiErrorMessage } from '@/lib/http';

const userCreateSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'staff']),
});

type UserCreateValues = z.infer<typeof userCreateSchema>;

export function UserCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserCreateValues>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      role: 'staff',
    },
  });

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      toast.success('User created');
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      navigate('/users', { replace: true });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to create user'));
    },
  });

  const onSubmit = (values: UserCreateValues) => {
    createMutation.mutate(values);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create User</CardTitle>
      </CardHeader>
      <CardBody>
        <form className="stack" onSubmit={handleSubmit(onSubmit)}>
          <Input label="Username" {...register('username')} error={errors.username?.message} />
          <Input label="Email" {...register('email')} error={errors.email?.message} />
          <Input
            label="Password"
            type="password"
            {...register('password')}
            error={errors.password?.message}
          />

          <div className="field">
            <label>Role</label>
            <select className="input" {...register('role')}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
            {errors.role ? <p className="field-error">{errors.role.message}</p> : null}
          </div>

          <div className="actions-row">
            <Button type="button" variant="ghost" onClick={() => navigate('/users')}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create user
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
