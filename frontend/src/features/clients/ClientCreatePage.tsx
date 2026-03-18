import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { clientsApi } from '@/api/clients';
import { queryKeys } from '@/api/queryKeys';
import { getApiErrorMessage } from '@/lib/http';

import { ClientForm } from './ClientForm';
import { toClientPayload, type ClientFormValues } from './clientFormSchema';

export function ClientCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (values: ClientFormValues) => clientsApi.create(toClientPayload(values)),
    onSuccess: (client) => {
      toast.success('Client created');
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      navigate(`/clients/${client.id}`, { replace: true });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to create client'));
    },
  });

  return (
    <ClientForm
      title="Create Client"
      submitLabel="Create Client"
      isSubmitting={createMutation.isPending}
      onCancel={() => navigate('/clients')}
      onSubmit={(values) => createMutation.mutate(values)}
    />
  );
}
