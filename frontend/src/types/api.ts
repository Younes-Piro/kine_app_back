export interface ApiErrorResponse {
  detail?: string;
  [key: string]: unknown;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: AuthUser;
}

export interface RefreshResponse {
  access: string;
  refresh?: string;
}

export interface MeResponse {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
}

export interface Permission {
  id: number;
  code: string;
  label: string;
}

export interface MyPermissionsResponse {
  role: 'admin' | 'staff';
  permissions: string[];
}

export interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  role: 'admin' | 'staff';
  profile_active: boolean;
}

export interface UserCreateRequest {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'staff';
}

export interface UserUpdateRequest {
  username?: string;
  email?: string;
  is_active?: boolean;
  role?: 'admin' | 'staff';
}

export interface AppOption {
  id: number;
  category: string;
  code: string;
  label: string;
  is_active: boolean;
  sort_order: number;
}

export interface Client {
  id: number;
  file_number: string;
  full_name: string;
  gender: number | null;
  gender_label: string | null;
  cin: string | null;
  birth_date: string | null;
  email: string | null;
  phone_number: string | null;
  address: string | null;
  marital_status: number | null;
  marital_status_label: string | null;
  social_security: number | null;
  social_security_label: string | null;
  dossier_type: number | null;
  dossier_type_label: string | null;
  balance: string;
  profile_photo: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientCreateRequest {
  full_name: string;
  gender?: number;
  cin?: string;
  birth_date?: string;
  email?: string;
  phone_number?: string;
  address?: string;
  marital_status?: number;
  social_security?: number;
  dossier_type?: number;
  balance?: string;
  profile_photo?: File;
}

export type ClientUpdateRequest = Partial<ClientCreateRequest>;

export interface TreatmentListItem {
  id: number;
  client: number;
  client_full_name: string;
  title: string | null;
  type_and_site: string;
  prescribed_sessions: number;
  completed_sessions: number;
  session_rhythm: number | null;
  session_rhythm_label: string | null;
  start_date: string;
  end_date: string | null;
  status: 'open' | 'completed' | 'cancelled';
  session_price: string;
  total_price: string;
  total_remaining_amount: string;
  balance: string;
  is_paid: boolean;
  is_active: boolean;
}

export interface InvoiceListItem {
  id: number;
  invoice_number: string;
  client: number;
  client_full_name: string;
  invoice_type: number;
  invoice_type_text: string;
  issue_date: string;
  start_date: string;
  end_date: string;
  number_of_sessions: number;
  unit_price: string;
  total_amount: string;
  created_at: string;
}
