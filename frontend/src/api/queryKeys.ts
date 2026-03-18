export const queryKeys = {
  auth: { me: ['auth', 'me'] as const },
  users: {
    all: ['users'] as const,
    detail: (id: number) => ['users', id] as const,
  },
  permissions: {
    catalog: ['permissions'] as const,
    me: ['permissions', 'me'] as const,
    user: (id: number) => ['permissions', 'users', id] as const,
  },
  clients: {
    all: ['clients'] as const,
    detail: (id: number) => ['clients', id] as const,
  },
  treatments: {
    all: ['treatments'] as const,
    byClient: (id: number) => ['treatments', { client_id: id }] as const,
    detail: (id: number) => ['treatments', id] as const,
    balance: (id: number) => ['treatments', id, 'balance'] as const,
  },
  sessions: {
    all: ['sessions'] as const,
    byClient: (id: number) => ['sessions', { client_id: id }] as const,
    byTreatment: (id: number) => ['sessions', { treatment_id: id }] as const,
    detail: (id: number) => ['sessions', id] as const,
  },
  payments: {
    all: ['payments'] as const,
    byTreatment: (id: number) => ['payments', { treatment: id }] as const,
  },
  invoices: {
    all: ['invoices'] as const,
    byClient: (id: number) => ['invoices', { client_id: id }] as const,
  },
  settings: {
    options: (category?: string) => ['settings', 'options', category] as const,
  },
};
