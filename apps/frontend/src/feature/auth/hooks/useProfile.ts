"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { readApiResponse } from "@/lib/api";

export interface UserProfile {
  fullName: string;
  email: string;
}

export function useProfile() {
  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    void loadProfile();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [loadProfile]);

  return {
    profile,
    isLoading,
    error,
    loadProfile,
  };
}
