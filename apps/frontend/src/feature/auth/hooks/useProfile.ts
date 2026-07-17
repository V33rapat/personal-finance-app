"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { readApiResponse } from "@/lib/api";
import { useToast } from "@/components/providers/ToastProvider";
import { TH_TEXT } from "@/constants/th";

export interface UserProfile {
  fullName: string;
  email: string;
  avatarUrl: string | null;
}

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function useProfile() {
  const router = useRouter();
  const { showToast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  const avatarAbortControllerRef = useRef<AbortController | null>(null);
  const isSavingRef = useRef(false);
  const isAvatarSavingRef = useRef(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isAvatarSaving, setIsAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const clearSaveError = useCallback(() => {
    setSaveError(null);
  }, []);

  const clearAvatarError = useCallback(() => {
    setAvatarError(null);
  }, []);

  const loadProfile = useCallback(async () => {
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/profile", {
        signal: controller.signal,
        cache: "no-store",
      });
      const data = await readApiResponse<UserProfile>(response, router);

      if (!controller.signal.aborted) {
        setProfile(data);
      }

      return data;
    } catch (err) {
      if (controller.signal.aborted) {
        return null;
      }

      setProfile(null);
      setError(err instanceof Error ? err.message : "Failed to load profile");
      return null;
    } finally {
      if (abortControllerRef.current === controller) {
        setIsLoading(false);
      }
    }
  }, [router]);

  const updateProfile = useCallback(
    async (fullName: string) => {
      const trimmedName = fullName.trim();
      setSaveError(null);

      if (!trimmedName) {
        setSaveError(TH_TEXT.profile.nameRequired);
        return null;
      }

      if (trimmedName.length < 3) {
        setSaveError(TH_TEXT.profile.nameMinLength);
        return null;
      }

      if (trimmedName.length > 50) {
        setSaveError(TH_TEXT.profile.nameMaxLength);
        return null;
      }

      if (!profile) {
        return null;
      }

      if (trimmedName === profile.fullName.trim()) {
        return profile;
      }

      if (isSavingRef.current) {
        return null;
      }

      isSavingRef.current = true;
      setIsSaving(true);

      try {
        const response = await fetch("/api/auth/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName: trimmedName }),
        });
        const data = await readApiResponse<UserProfile>(response, router);

        setProfile(data);
        showToast({ title: TH_TEXT.profile.updateSuccess });
        return data;
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : TH_TEXT.profile.updateFailed);
        return null;
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);
      }
    },
    [profile, router, showToast],
  );

  const uploadAvatar = useCallback(
    async (file: File) => {
      setAvatarError(null);

      if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
        setAvatarError(TH_TEXT.profile.avatarTypeError);
        return null;
      }

      if (file.size > MAX_AVATAR_SIZE) {
        setAvatarError(TH_TEXT.profile.avatarSizeError);
        return null;
      }

      if (isAvatarSavingRef.current) return null;

      avatarAbortControllerRef.current?.abort();
      const controller = new AbortController();
      avatarAbortControllerRef.current = controller;
      isAvatarSavingRef.current = true;
      setIsAvatarSaving(true);

      try {
        const body = new FormData();
        body.append("file", file);

        const response = await fetch("/api/auth/profile/avatar", {
          method: "POST",
          body,
          signal: controller.signal,
        });
        const data = await readApiResponse<UserProfile>(response, router);

        if (!controller.signal.aborted) {
          setProfile(data);
          showToast({ title: TH_TEXT.profile.avatarUploadSuccess });
        }

        return data;
      } catch (err) {
        if (controller.signal.aborted) return null;

        setAvatarError(err instanceof Error ? err.message : TH_TEXT.profile.avatarUploadFailed);
        return null;
      } finally {
        if (avatarAbortControllerRef.current === controller) {
          avatarAbortControllerRef.current = null;
          isAvatarSavingRef.current = false;
          setIsAvatarSaving(false);
        }
      }
    },
    [router, showToast],
  );

  const deleteAvatar = useCallback(async () => {
    setAvatarError(null);

    if (!profile?.avatarUrl || isAvatarSavingRef.current) return null;

    avatarAbortControllerRef.current?.abort();
    const controller = new AbortController();
    avatarAbortControllerRef.current = controller;
    isAvatarSavingRef.current = true;
    setIsAvatarSaving(true);

    try {
      const response = await fetch("/api/auth/profile/avatar", {
        method: "DELETE",
        signal: controller.signal,
      });
      const data = await readApiResponse<UserProfile>(response, router);

      if (!controller.signal.aborted) {
        setProfile(data);
        showToast({ title: TH_TEXT.profile.avatarDeleteSuccess });
      }

      return data;
    } catch (err) {
      if (controller.signal.aborted) return null;

      setAvatarError(err instanceof Error ? err.message : TH_TEXT.profile.avatarDeleteFailed);
      return null;
    } finally {
      if (avatarAbortControllerRef.current === controller) {
        avatarAbortControllerRef.current = null;
        isAvatarSavingRef.current = false;
        setIsAvatarSaving(false);
      }
    }
  }, [profile?.avatarUrl, router, showToast]);

  useEffect(() => {
    void loadProfile();

    return () => {
      abortControllerRef.current?.abort();
      avatarAbortControllerRef.current?.abort();
    };
  }, [loadProfile]);

  return {
    profile,
    isLoading,
    isSaving,
    error,
    saveError,
    isAvatarSaving,
    avatarError,
    clearSaveError,
    clearAvatarError,
    loadProfile,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
  };
}
