// ---------------------------------------------------------------------------
// lib/validation.ts
// Pure validation functions — ไม่มี side-effect ทดสอบง่าย
// ---------------------------------------------------------------------------

import { TH_TEXT } from "@/constants/th";
import type {
  ChangePasswordFormData,
  ChangePasswordFormErrors,
  RegisterFormData,
  RegisterFormErrors,
} from "../types/auth";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_CASE_PATTERN = /(?=.*[a-z])(?=.*[A-Z])/;

export function validatePassword(password: string, requiredMessage: string = TH_TEXT.auth.passwordRequired) {
  if (!password) {
    return requiredMessage;
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return TH_TEXT.auth.passwordMinLength;
  }

  if (!PASSWORD_CASE_PATTERN.test(password)) {
    return TH_TEXT.auth.passwordPattern;
  }

  return undefined;
}

export function validateRegisterForm(data: RegisterFormData): RegisterFormErrors {
  const errors: RegisterFormErrors = {};

  // username
  if (!data.username.trim()) {
    errors.username = TH_TEXT.auth.usernameRequired;
  } else if (data.username.trim().length < 3) {
    errors.username = TH_TEXT.auth.usernameMinLength;
  } else if (!/^[a-zA-Z0-9_]+$/.test(data.username.trim())) {
    errors.username = TH_TEXT.auth.usernamePattern;
  }

  // email
  if (!data.email.trim()) {
    errors.email = TH_TEXT.auth.emailRequired;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = TH_TEXT.auth.emailInvalid;
  }

  // password
  errors.password = validatePassword(data.password);

  // confirmPassword
  if (!data.confirmPassword) {
    errors.confirmPassword = TH_TEXT.auth.confirmPasswordRequired;
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = TH_TEXT.auth.passwordMismatch;
  }

  return errors;
}

export function validateChangePasswordForm(
  data: ChangePasswordFormData,
): ChangePasswordFormErrors {
  const errors: ChangePasswordFormErrors = {};

  if (!data.currentPassword) {
    errors.currentPassword = TH_TEXT.profile.currentPasswordRequired;
  }

  errors.newPassword = validatePassword(data.newPassword, TH_TEXT.profile.newPasswordRequired);

  if (!data.confirmPassword) {
    errors.confirmPassword = TH_TEXT.profile.confirmNewPasswordRequired;
  } else if (data.newPassword !== data.confirmPassword) {
    errors.confirmPassword = TH_TEXT.auth.passwordMismatch;
  }

  if (data.currentPassword && data.newPassword === data.currentPassword) {
    errors.newPassword = TH_TEXT.profile.newPasswordMustDiffer;
  }

  return errors;
}

export function isFormValid(errors: RegisterFormErrors, data: RegisterFormData): boolean {
  const hasErrors = Object.keys(errors).length > 0;
  const hasEmptyFields = !data.username || !data.email || !data.password || !data.confirmPassword;
  return !hasErrors && !hasEmptyFields;
}

export function getPasswordStrength(password: string): {
  score: number; // 0-4
  label: string;
  color: string;
} {
  if (!password) return { score: 0, label: "", color: "" };

  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const levels = [
    { label: "อ่อนมาก", color: "bg-red-500" },
    { label: "อ่อน",    color: "bg-orange-400" },
    { label: "ปานกลาง", color: "bg-yellow-400" },
    { label: "แข็งแกร่ง", color: "bg-green-500" },
    { label: "แข็งมาก",  color: "bg-emerald-500" },
  ];

  const idx = Math.min(score, 4);
  return { score: idx, ...levels[idx] };
}
