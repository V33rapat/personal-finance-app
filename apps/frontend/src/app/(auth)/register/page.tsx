// ---------------------------------------------------------------------------
// app/register/page.tsx
// Register page — layout + card container + RegisterForm
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import RegisterForm from "@/feature/auth/components/RegisterForm";

export const metadata: Metadata = {
  title: "สมัครสมาชิก | Walpaca",
  description: "สร้างบัญชีเพื่อเริ่มจัดการการเงินส่วนตัว",
};

export default function RegisterPage() {
  return (
    /*
     * Full-screen centered layout
     * bg-[radial-gradient...] สร้าง subtle glow บน light mode
     * dark:bg-slate-950 + dark pattern สำหรับ dark mode
     */
    <main className="relative min-h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 py-12">

      {/* Decorative background blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 -left-20 h-[500px] w-[500px] rounded-full bg-violet-200/40 blur-3xl dark:bg-violet-900/20" />
        <div className="absolute -bottom-32 right-0 h-[400px] w-[400px] rounded-full bg-indigo-200/30 blur-3xl dark:bg-indigo-900/15" />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Card container */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 px-8 py-10 shadow-xl shadow-slate-200/60 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/80 dark:shadow-slate-950/60">

          {/* Header */}
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            {/* Logo mark */}
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm3 0h1.5m-1.5 0h-1.5m-9 0H6m-1.5 0H3"/>
              </svg>
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                Walpaca
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                สร้างบัญชีเพื่อเริ่มจัดการการเงินของคุณ
              </p>
            </div>
          </div>

          {/* Form */}
          <RegisterForm />
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-600">
          การสมัครสมาชิกถือว่าคุณยอมรับ{" "}
          <a href="/terms" className="underline underline-offset-2 hover:text-slate-600 dark:hover:text-slate-400 transition-colors">
            ข้อกำหนดการใช้งาน
          </a>{" "}
          และ{" "}
          <a href="/privacy" className="underline underline-offset-2 hover:text-slate-600 dark:hover:text-slate-400 transition-colors">
            นโยบายความเป็นส่วนตัว
          </a>
        </p>
      </div>
    </main>
  );
}