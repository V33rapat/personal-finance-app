"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import PasswordStrength from "@/components/ui/PasswordStrength";
import { TH_TEXT } from "@/constants/th";
import { useChangePassword } from "@/feature/auth/hooks/useChangePassword";
import { validateChangePasswordForm } from "@/feature/auth/lib/validation";
import type { ChangePasswordFormData, ChangePasswordFormErrors } from "@/feature/auth/types/auth";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INITIAL_FORM: ChangePasswordFormData = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function EyeIcon({ isVisible }: { isVisible: boolean }) {
  return isVisible ? (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
    </svg>
  ) : (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const { isSaving, error: submitError, clearError, changePassword } = useChangePassword();
  const currentPasswordRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<ChangePasswordFormData>(INITIAL_FORM);
  const [touched, setTouched] = useState<Partial<Record<keyof ChangePasswordFormData, boolean>>>({});
  const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] = useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  const allErrors = useMemo(() => validateChangePasswordForm(formData), [formData]);
  const errors = useMemo(() => {
    const visible: ChangePasswordFormErrors = {};
    (Object.keys(allErrors) as (keyof ChangePasswordFormErrors)[]).forEach((key) => {
      if (touched[key]) visible[key] = allErrors[key];
    });
    return visible;
  }, [allErrors, touched]);

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM);
    setTouched({});
    setIsCurrentPasswordVisible(false);
    setIsNewPasswordVisible(false);
    setIsConfirmPasswordVisible(false);
    clearError();
  }, [clearError]);

  const handleClose = useCallback(() => {
    if (isSaving) return;
    resetForm();
    onClose();
  }, [isSaving, onClose, resetForm]);

  useEffect(() => {
    if (!isOpen) return;

    const focusTimer = window.setTimeout(() => currentPasswordRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClose, isOpen]);

  if (!isOpen) return null;

  const updateField = (field: keyof ChangePasswordFormData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
    clearError();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({ currentPassword: true, newPassword: true, confirmPassword: true });

    if (Object.keys(validateChangePasswordForm(formData)).length > 0) return;

    await changePassword({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={TH_TEXT.common.close}
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        disabled={isSaving}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="change-password-title" className="text-lg font-bold text-slate-900 dark:text-slate-50">
              {TH_TEXT.profile.changePassword}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {TH_TEXT.profile.changePasswordDescription}
            </p>
          </div>
          <button
            type="button"
            aria-label={TH_TEXT.common.close}
            title={TH_TEXT.common.close}
            onClick={handleClose}
            disabled={isSaving}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M5.3 5.3a1 1 0 0 1 1.4 0L10 8.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 10l3.3 3.3a1 1 0 0 1-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 10 5.3 6.7a1 1 0 0 1 0-1.4Z" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
          <FormField
            ref={currentPasswordRef}
            label={TH_TEXT.profile.currentPassword}
            id="current-password"
            type={isCurrentPasswordVisible ? "text" : "password"}
            autoComplete="current-password"
            value={formData.currentPassword}
            error={errors.currentPassword}
            disabled={isSaving}
            onChange={(event) => updateField("currentPassword", event.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, currentPassword: true }))}
            rightSlot={
              <button
                type="button"
                aria-label={isCurrentPasswordVisible ? TH_TEXT.auth.hidePassword : TH_TEXT.auth.showPassword}
                title={isCurrentPasswordVisible ? TH_TEXT.auth.hidePassword : TH_TEXT.auth.showPassword}
                disabled={isSaving}
                onClick={() => setIsCurrentPasswordVisible((current) => !current)}
                className="text-slate-400 transition hover:text-slate-700 disabled:cursor-not-allowed dark:hover:text-slate-200"
              >
                <EyeIcon isVisible={isCurrentPasswordVisible} />
              </button>
            }
          />

          <div className="flex flex-col gap-2">
            <FormField
              label={TH_TEXT.profile.newPassword}
              id="new-password"
              type={isNewPasswordVisible ? "text" : "password"}
              autoComplete="new-password"
              value={formData.newPassword}
              error={errors.newPassword}
              disabled={isSaving}
              onChange={(event) => updateField("newPassword", event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, newPassword: true }))}
              rightSlot={
                <button
                  type="button"
                  aria-label={isNewPasswordVisible ? TH_TEXT.auth.hidePassword : TH_TEXT.auth.showPassword}
                  title={isNewPasswordVisible ? TH_TEXT.auth.hidePassword : TH_TEXT.auth.showPassword}
                  disabled={isSaving}
                  onClick={() => setIsNewPasswordVisible((current) => !current)}
                  className="text-slate-400 transition hover:text-slate-700 disabled:cursor-not-allowed dark:hover:text-slate-200"
                >
                  <EyeIcon isVisible={isNewPasswordVisible} />
                </button>
              }
            />
            <PasswordStrength password={formData.newPassword} />
          </div>

          <FormField
            label={TH_TEXT.profile.confirmNewPassword}
            id="confirm-new-password"
            type={isConfirmPasswordVisible ? "text" : "password"}
            autoComplete="new-password"
            value={formData.confirmPassword}
            error={errors.confirmPassword}
            disabled={isSaving}
            onChange={(event) => updateField("confirmPassword", event.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, confirmPassword: true }))}
            rightSlot={
              <button
                type="button"
                aria-label={isConfirmPasswordVisible ? TH_TEXT.auth.hidePassword : TH_TEXT.auth.showPassword}
                title={isConfirmPasswordVisible ? TH_TEXT.auth.hidePassword : TH_TEXT.auth.showPassword}
                disabled={isSaving}
                onClick={() => setIsConfirmPasswordVisible((current) => !current)}
                className="text-slate-400 transition hover:text-slate-700 disabled:cursor-not-allowed dark:hover:text-slate-200"
              >
                <EyeIcon isVisible={isConfirmPasswordVisible} />
              </button>
            }
          />

          {submitError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {submitError}
            </p>
          )}

          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            {TH_TEXT.profile.changePasswordSessionNotice}
          </p>

          <div className="mt-1 flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={handleClose} disabled={isSaving}>
              {TH_TEXT.profile.cancel}
            </Button>
            <Button type="submit" className="flex-1" disabled={isSaving} aria-busy={isSaving}>
              {isSaving ? TH_TEXT.profile.changingPassword : TH_TEXT.profile.savePassword}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
