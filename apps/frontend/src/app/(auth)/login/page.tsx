// ---------------------------------------------------------------------------
// app/login/page.tsx
// Login page — split layout (left: info, right: form)
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LoginForm from "@/feature/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ | Walpaca",
  description: "เข้าสู่ระบบเพื่อจัดการการเงินส่วนตัว",
};

export default function LoginPage() {
  return (
    <main className="relative min-h-screen bg-slate-50 dark:bg-slate-950 flex">

      {/* Desktop: Hide on mobile */}
      <div className="hidden lg:block fixed top-12 right-12 z-50">
        <ThemeToggle />
      </div>

      {/* ── Left side: Branding & Info ──────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative flex-col justify-between overflow-hidden p-12 xl:p-16">

        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -left-20 h-[600px] w-[600px] rounded-full bg-violet-200/30 blur-3xl dark:bg-violet-900/20" />
          <div className="absolute -bottom-32 right-0 h-[500px] w-[500px] rounded-full bg-indigo-200/20 blur-3xl dark:bg-indigo-900/15" />
        </div>

        {/* Top: Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm3 0h1.5m-1.5 0h-1.5m-9 0H6m-1.5 0H3" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Walpaca</span>
          </div>
        </div>

        {/* Middle: Main content */}
        <div className="relative z-10 max-w-lg">
          <h1 className="text-4xl font-bold tracking-tight text-slate-800 dark:text-slate-100 xl:text-5xl">
            จัดการ<span className="text-violet-600 dark:text-violet-400"> การเงิน</span> ของคุณ
          </h1>
          <p className="mt-6 text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            Walpaca ช่วยให้คุณติดตามรายรับรายจ่าย วางแผนงบประมาณ และบริหารเงินได้อย่างเป็นระบบ เพื่อก้าวสู่ความอิสระทางการเงินได้ง่ายขึ้น
          </p>

          {/* Feature highlights */}
          <div className="mt-10 grid gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40">
                <svg className="h-4 w-4 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125z" />
                </svg>
              </div>
              <span className="text-slate-600 dark:text-slate-300">ติดตามรายรับรายจ่ายแบบเรียลไทม์</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
                <svg className="h-4 w-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <span className="text-slate-600 dark:text-slate-300">วิเคราะห์และเห็นภาพรวมการเงิน</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
              </div>
              <span className="text-slate-600 dark:text-slate-300">ปลอดภัย เชื่อถือได้ ใช้งานง่าย</span>
            </div>
          </div>
        </div>

        {/* Bottom: Copyright */}
        <div className="relative z-10 text-sm text-slate-400 dark:text-slate-500">
          © 2026 Walpaca. All rights reserved.
        </div>
      </div>

      {/* ── Right side: Login Form ─────────────────────────────────────────── */}
      <div className="flex w-full lg:w-1/2 xl:w-[45%] items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-md">

          {/* Mobile: Top bar */}
          <div className="flex items-center justify-between lg:hidden mb-8">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm3 0h1.5m-1.5 0h-1.5m-9 0H6m-1.5 0H3" />
                </svg>
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-100">Walpaca</span>
            </div>
            <ThemeToggle />
          </div>


          {/* Card container */}
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 px-8 py-10 shadow-xl shadow-slate-200/60 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/80 dark:shadow-slate-950/60">

            {/* Header */}
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                เข้าสู่ระบบ
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                ยินดีต้อนรับกลับมา! กรุณาเข้าสู่ระบบ
              </p>
            </div>

            {/* Form */}
            <LoginForm />
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-600 lg:hidden">
            © 2025 Walpaca. All rights reserved.
          </p>
        </div>
      </div>
    </main>
  );
}