export type AdminRole = "SUPER_ADMIN" | "ADMIN" | "MODERATOR";

export interface AdminResponse {
  id: string;
  name: string | null;
  email: string;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  refresh_expires_in: number;
}
