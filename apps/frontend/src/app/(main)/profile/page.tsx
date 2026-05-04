import type { Metadata } from "next";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Profile | Walpaca",
  description: "Manage your Walpaca profile.",
};

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
          Account
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Profile
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          Basic account settings and identity details will live here.
        </p>
      </header>

      <Card className="p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-lg font-bold text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-900/60">
              WV
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Walpaca User</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">user@example.com</p>
            </div>
          </div>

          <Button variant="secondary">Edit Profile</Button>
        </div>
      </Card>
    </div>
  );
}
