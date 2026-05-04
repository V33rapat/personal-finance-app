// ---------------------------------------------------------------------------
// lib/validation.ts
// Login validation functions
// ---------------------------------------------------------------------------

import { TH_TEXT } from "@/constants/th";
import type { LoginFormData, LoginFormErrors } from "../types/login";

export function validateLoginForm(data: LoginFormData): LoginFormErrors {
  const errors: LoginFormErrors = {};

  // email
  if (!data.email.trim()) {
    errors.email = TH_TEXT.auth.emailRequired;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = TH_TEXT.auth.emailInvalid;
  }

  // password
  if (!data.password) {
    errors.password = TH_TEXT.auth.passwordRequired;
  }

  return errors;
}

export function isLoginFormValid(errors: LoginFormErrors, data: LoginFormData): boolean {
  const hasErrors = Object.keys(errors).length > 0;
  const hasEmptyFields = !data.email || !data.password;
  return !hasErrors && !hasEmptyFields;
}
