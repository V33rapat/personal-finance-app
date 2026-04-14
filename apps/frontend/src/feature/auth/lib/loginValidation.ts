// ---------------------------------------------------------------------------
// lib/validation.ts
// Login validation functions
// ---------------------------------------------------------------------------

import type { LoginFormData, LoginFormErrors } from "../types/login";

export function validateLoginForm(data: LoginFormData): LoginFormErrors {
  const errors: LoginFormErrors = {};

  // email
  if (!data.email.trim()) {
    errors.email = "กรุณากรอก Email";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = "รูปแบบ Email ไม่ถูกต้อง";
  }

  // password
  if (!data.password) {
    errors.password = "กรุณากรอก Password";
  }

  return errors;
}

export function isLoginFormValid(errors: LoginFormErrors, data: LoginFormData): boolean {
  const hasErrors = Object.keys(errors).length > 0;
  const hasEmptyFields = !data.email || !data.password;
  return !hasErrors && !hasEmptyFields;
}