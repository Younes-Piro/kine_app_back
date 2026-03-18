import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useLogin } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const redirectTo = useMemo(() => {
    const redirect = searchParams.get('redirect');
    const candidate = redirect ? decodeURIComponent(redirect) : '/';
    return candidate.startsWith('/') ? candidate : '/';
  }, [searchParams]);
  const accessToken = useAuthStore((state) => state.accessToken);
  const loginMutation = useLogin(redirectTo);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  if (accessToken) {
    return <Navigate to={redirectTo} replace />;
  }

  const onSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values);
  };

  return (
    <>
      <CardHeader>
        <CardTitle>Sign in to KineApp</CardTitle>
        <p>Use your backend user credentials.</p>
      </CardHeader>
      <CardBody>
        <form className="stack" onSubmit={handleSubmit(onSubmit)}>
          <Input label="Username" {...register('username')} error={errors.username?.message} />
          <Input
            label="Password"
            type="password"
            {...register('password')}
            error={errors.password?.message}
          />
          <Button type="submit" isLoading={loginMutation.isPending}>
            Login
          </Button>
        </form>
      </CardBody>
    </>
  );
}
