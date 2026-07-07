"use client";

import { ReactNode, useEffect } from "react";

function getRequestPath(input: RequestInfo | URL) {
  if (typeof input === "string") {
    return new URL(input, window.location.origin).pathname;
  }

  if (input instanceof URL) {
    return input.pathname;
  }

  return new URL(input.url, window.location.origin).pathname;
}

function shouldRedirectToLogin(input: RequestInfo | URL, response: Response) {
  if (response.status !== 401) return false;

  const path = getRequestPath(input);
  const isAuthApi = path.startsWith("/api/auth");
  const isProtectedApi = path.startsWith("/api/");
  const isAlreadyOnAuthPage =
    window.location.pathname === "/login" || window.location.pathname === "/register";

  return isProtectedApi && !isAuthApi && !isAlreadyOnAuthPage;
}

export function AuthRedirectProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const originalFetch = window.fetch;
    let isRedirecting = false;

    const fetchWithAuthRedirect: typeof window.fetch = async (input, init) => {
      const response = await originalFetch(input, init);

      if (!isRedirecting && shouldRedirectToLogin(input, response)) {
        isRedirecting = true;
        window.location.assign("/login");
      }

      return response;
    };

    window.fetch = fetchWithAuthRedirect;

    return () => {
      if (window.fetch === fetchWithAuthRedirect) {
        window.fetch = originalFetch;
      }
    };
  }, []);

  return children;
}
