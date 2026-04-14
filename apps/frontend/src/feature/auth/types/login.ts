// ---------------------------------------------------------------------------
// types/login.ts
// Login form types
// ---------------------------------------------------------------------------

export interface LoginFormData {
  email: string;
  password: string;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
}