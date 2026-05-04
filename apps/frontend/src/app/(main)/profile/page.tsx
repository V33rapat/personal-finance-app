import type { Metadata } from "next";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { TH_TEXT } from "@/constants/th";

export const metadata: Metadata = {
  title: TH_TEXT.profile.metadataTitle,
  description: TH_TEXT.profile.metadataDescription,
};

export default function ProfilePage() {
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
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-lg font-bold text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-900/60">
              WV
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{TH_TEXT.profile.fullName}</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-50">{TH_TEXT.profile.displayName}</h2>
              <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-400">{TH_TEXT.profile.email}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{TH_TEXT.profile.displayEmail}</p>
            </div>
          </div>

          <Button variant="secondary">{TH_TEXT.profile.editProfile}</Button>
        </div>
      </Card>
    </div>
  );
}
