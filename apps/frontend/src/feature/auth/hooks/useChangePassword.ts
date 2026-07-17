"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/ToastProvider";
import { TH_TEXT } from "@/constants/th";
import { readApiResponse } from "@/lib/api";

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

interface ChangePasswordResponse {
  message?: string;
}

export function useChangePassword() {
  const router = useRouter();
  const { showToast } = useToast();
  const isSavingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const changePassword = useCallback(
    async ({ currentPassword, newPassword }: ChangePasswordInput) => {
      if (isSavingRef.current) return false;

      isSavingRef.current = true;
      setIsSaving(true);
      setError(null);

      try {
        const response = await fetch("/api/auth/profile/password", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        await readApiResponse<ChangePasswordResponse>(response, router);

        showToast({ title: TH_TEXT.profile.changePasswordSuccess });
        router.replace("/login");
        return true;
      } catch (failure) {
        setError(
          failure instanceof Error ? failure.message : TH_TEXT.profile.changePasswordFailed,
        );
        return false;
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);
      }
    },
    [router, showToast],
  );

  return { isSaving, error, clearError, changePassword };
}
