import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Navigate } from 'react-router-dom';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useLogin } from '@/hooks/useAuth';
import { showFormValidationToast } from '@/lib/formValidation';
import { useAuthStore } from '@/store/authStore';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const loginMutation = useLogin();

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
    return <Navigate to="/" replace />;
  }

  const onSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values);
  };

  return (
    <div className="auth-form-content">
      <div className="auth-form-header">
        <h2>Welcome back</h2>
        <p>Please enter your credentials to access your account.</p>
      </div>
      
      <form className="stack" onSubmit={handleSubmit(onSubmit, showFormValidationToast)}>
        <Input label="Username" {...register('username')} error={errors.username?.message} />
        <Input
          label="Password"
          type="password"
          {...register('password')}
          error={errors.password?.message}
        />
        
        <div className="auth-form-actions">
          <Button type="submit" isLoading={loginMutation.isPending} size="lg" className="full-width">
            Sign In
          </Button>
        </div>
      </form>
    </div>
  );
}
