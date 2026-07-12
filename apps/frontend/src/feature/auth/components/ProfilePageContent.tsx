"use client";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { TH_TEXT } from "@/constants/th";
import LogoutButton from "@/feature/auth/components/LogoutButton";
import { useProfile } from "@/feature/auth/hooks/useProfile";

function getInitials(fullName: string) {
  const initials = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || "U";
}

export default function ProfilePageContent() {
  const { profile, isLoading, error, loadProfile } = useProfile();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
          {TH_TEXT.profile.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {TH_TEXT.profile.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          {TH_TEXT.profile.subtitle}
        </p>
      </header>

      <Card className="p-6">
        {isLoading ? (
          <div className="flex animate-pulse flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-slate-200 dark:bg-slate-800" />
              <div className="space-y-3">
                <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
            <Button variant="secondary" onClick={() => void loadProfile()}>
              ลองใหม่
            </Button>
          </div>
        ) : profile ? (
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-lg font-bold text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-900/60">
                {getInitials(profile.fullName)}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  {TH_TEXT.profile.fullName}
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-50">
                  {profile.fullName}
                </h2>
                <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  {TH_TEXT.profile.email}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {profile.email}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button variant="secondary">{TH_TEXT.profile.editProfile}</Button>
              <LogoutButton />
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
