"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type ToastType = "success" | "error";

interface ToastInput {
  title: string;
  description?: string;
  type?: ToastType;
}

interface Toast extends Required<ToastInput> {
  id: string;
}

interface ToastContextValue {
  showToast: (toast: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const typeStyles: Record<ToastType, string> = {
  success:
    "border-emerald-200 bg-white text-slate-900 shadow-emerald-950/10 dark:border-emerald-900/70 dark:bg-slate-900 dark:text-slate-50",
  error:
    "border-red-200 bg-white text-slate-900 shadow-red-950/10 dark:border-red-900/70 dark:bg-slate-900 dark:text-slate-50",
};

const iconStyles: Record<ToastType, string> = {
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  error: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
};

function ToastIcon({ type }: { type: ToastType }) {
  return (
    <span
      className={[
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
        iconStyles[type],
      ].join(" ")}
      aria-hidden
    >
      {type === "success" ? (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.31a1 1 0 0 1-1.42.001L3.29 9.204a1 1 0 1 1 1.42-1.408l4.04 4.09 6.54-6.59a1 1 0 0 1 1.414-.006Z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.5a.75.75 0 0 0-1.5 0v4a.75.75 0 0 0 1.5 0v-4ZM10 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </span>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, description = "", type = "success" }: ToastInput) => {
      const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      const toast: Toast = { id, title, description, type };

      setToasts((current) => [toast, ...current].slice(0, 4));
      window.setTimeout(() => removeToast(id), 3500);
    },
    [removeToast]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed right-4 top-4 z-[80] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={[
              "flex items-start gap-3 rounded-2xl border p-4 shadow-xl backdrop-blur",
              typeStyles[toast.type],
            ].join(" ")}
          >
            <ToastIcon type={toast.type} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description && (
                <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="Close notification"
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M5.3 5.3a1 1 0 0 1 1.4 0L10 8.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 10l3.3 3.3a1 1 0 0 1-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 10 5.3 6.7a1 1 0 0 1 0-1.4Z" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
