/** Mirrors com.authentication.models.response.SessionUserResponse */
export interface SessionUser {
  username: string;
  customerId: string | null;
  roles: string[];
  /** PERM_ADD, PERM_EDIT and/or PERM_DELETE granted by the user's role. */
  permissions?: string[];
}

/** Mirrors com.authentication.models.Permissions */
export const PERMISSIONS = {
  add: 'PERM_ADD',
  edit: 'PERM_EDIT',
  delete: 'PERM_DELETE',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface LoginCredentials {
  email: string;
  password: string;
}

/** A role name from the backend roles table (for example CUSTOMER, MANAGER, ADMIN). */
export type UserRole = string;

/** Mirrors com.authentication.models.response.UserResponse (never includes the password hash) */
export interface ManagedUser {
  id: string;
  customerId: string;
  email: string;
  role: UserRole;
  enabled: boolean;
  createdAt: string;
}

/** Mirrors com.authentication.models.response.PageResponse */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Mirrors com.authentication.models.request.UserCreatePayload */
export interface UserCreatePayload {
  customerId: string;
  email: string;
  password: string;
  role: UserRole | null;
}

/** Mirrors com.authentication.models.request.UserUpdatePayload; null means "leave unchanged". */
export interface UserUpdatePayload {
  email: string | null;
  password: string | null;
  role: UserRole | null;
  enabled: boolean | null;
}
