/** Mirrors com.authentication.models.response.SessionUserResponse */
export interface SessionUser {
  username: string;
  customerId: string | null;
  roles: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}
