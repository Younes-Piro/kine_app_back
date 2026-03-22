import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { clientsApi } from '@/api/clients';
import { queryKeys } from '@/api/queryKeys';
import { getApiErrorMessage } from '@/lib/http';

import { ClientForm } from './ClientForm';
import { toClientPayload, type ClientFormValues } from './clientFormSchema';

export function ClientEditPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = useParams<{ id: string }>();
  const clientId = Number(params.id);

  const clientQuery = useQuery({
    queryKey: queryKeys.clients.detail(clientId),
    queryFn: () => clientsApi.detail(clientId),
    enabled: Number.isFinite(clientId),
  });

  const updateMutation = useMutation({
    mutationFn: (values: ClientFormValues) => clientsApi.update(clientId, toClientPayload(values)),
    onSuccess: (client) => {
      toast.success('Client updated');
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(clientId) });
      navigate(`/clients/${client.id}`, { replace: true });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to update client'));
    },
  });

  if (!Number.isFinite(clientId)) {
    return <p>Invalid client id.</p>;
  }

  if (clientQuery.isLoading) {
    return <p>Loading client...</p>;
  }

  if (clientQuery.isError || !clientQuery.data) {
    return <p>Client not found.</p>;
  }

  const client = clientQuery.data;

  return (
    <ClientForm
      title={`Edit Client: ${client.full_name}`}
      submitLabel="Save changes"
      existingPhoto={client.profile_photo}
      isSubmitting={updateMutation.isPending}
      defaultValues={{
        full_name: client.full_name,
        gender: client.gender ?? undefined,
        cin: client.cin ?? '',
        birth_date: client.birth_date ?? '',
        email: client.email ?? '',
        phone_number: client.phone_number ?? '',
        address: client.address ?? '',
        marital_status: client.marital_status ?? undefined,
        social_security: client.social_security ?? undefined,
        dossier_type: client.dossier_type ?? undefined,
      }}
      onCancel={() => navigate(`/clients/${client.id}`)}
      onSubmit={(values) => updateMutation.mutate(values)}
    />
  );
}
