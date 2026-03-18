import { create } from 'zustand';

import type { MyPermissionsResponse } from '@/types/api';

interface PermissionsState {
  role: 'admin' | 'staff' | null;
  permissions: string[];
  setFromResponse: (response: MyPermissionsResponse) => void;
  clear: () => void;
  hasPermission: (code: string) => boolean;
}

export const usePermissionsStore = create<PermissionsState>((set, get) => ({
  role: null,
  permissions: [],
  setFromResponse: (response) => {
    set({ role: response.role, permissions: response.permissions });
  },
  clear: () => {
    set({ role: null, permissions: [] });
  },
  hasPermission: (code) => {
    const { role, permissions } = get();

    if (role === 'admin') {
      return true;
    }

    return permissions.includes(code);
  },
}));
