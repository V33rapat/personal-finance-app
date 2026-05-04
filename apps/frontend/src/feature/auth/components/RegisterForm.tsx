// ---------------------------------------------------------------------------
// components/RegisterForm.tsx
// Form UI หลัก — ใช้ useRegisterForm hook สำหรับ logic ทั้งหมด
// ---------------------------------------------------------------------------

"use client";

import { useState } from "react";
import Link from "next/link";
import FormField from "@/components/ui/FormField";
import PasswordStrength from "@/components/ui/PasswordStrength";
import { TH_TEXT } from "@/constants/th";
import { useRegisterForm } from "../hooks/useRegisterForm";

// ── Icon: Eye / EyeOff ───────────────────────────────────────────────────────
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="h-4 w-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
    </svg>
  ) : (
    <svg className="h-4 w-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"/>
    </svg>
  );
}

// ── Icon: Loader spinner ──────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function RegisterForm() {
  const {
    formData, errors, submitStatus, apiMessage,
    isValid, handleChange, handleBlur, handleSubmit,
  } = useRegisterForm();

  const [showPassword, setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirm]  = useState(false);

  const isLoading = submitStatus === "loading";
  const isSuccess = submitStatus === "success";

  // ── Success state ──────────────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <div className="flex flex-col items-center gap-6 py-4 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
          <svg className="h-8 w-8 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">สมัครสมาชิกสำเร็จ!</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{apiMessage}</p>
        </div>
        <Link
          href="/login"
          className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
        >
          เข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

      {/* API Error Banner */}
      {submitStatus === "error" && apiMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <svg className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd"/>
          </svg>
          <span>{apiMessage}</span>
        </div>
      )}

      {/* Username */}
      <FormField
        label={TH_TEXT.auth.username}
        id="username"
        type="text"
        placeholder="เช่น john_doe"
        autoComplete="username"
        value={formData.username}
        error={errors.username}
        disabled={isLoading}
        onChange={(e) => handleChange("username", e.target.value)}
        onBlur={() => handleBlur("username")}
      />

      {/* Email */}
      <FormField
        label={TH_TEXT.auth.email}
        id="email"
        type="email"
        placeholder="your@email.com"
        autoComplete="email"
        value={formData.email}
        error={errors.email}
        disabled={isLoading}
        onChange={(e) => handleChange("email", e.target.value)}
        onBlur={() => handleBlur("email")}
      />

      {/* Password */}
      <div className="flex flex-col gap-2">
        <FormField
          label={TH_TEXT.auth.password}
          id="password"
          type={showPassword ? "text" : "password"}
          placeholder="อย่างน้อย 8 ตัวอักษร"
          autoComplete="new-password"
          value={formData.password}
          error={errors.password}
          disabled={isLoading}
          onChange={(e) => handleChange("password", e.target.value)}
          onBlur={() => handleBlur("password")}
          rightSlot={
            <button
              type="button"
              tabIndex={-1}
              aria-label={showPassword ? TH_TEXT.auth.hidePassword : TH_TEXT.auth.showPassword}
              onClick={() => setShowPassword((v) => !v)}
            >
              <EyeIcon open={showPassword} />
            </button>
          }
        />
        <PasswordStrength password={formData.password} />
      </div>

      {/* Confirm Password */}
      <FormField
        label={TH_TEXT.auth.confirmPassword}
        id="confirm-password"
        type={showConfirmPassword ? "text" : "password"}
        placeholder="กรอก password อีกครั้ง"
        autoComplete="new-password"
        value={formData.confirmPassword}
        error={errors.confirmPassword}
        disabled={isLoading}
        onChange={(e) => handleChange("confirmPassword", e.target.value)}
        onBlur={() => handleBlur("confirmPassword")}
        rightSlot={
          <button
            type="button"
            tabIndex={-1}
            aria-label={showConfirmPassword ? TH_TEXT.auth.hidePassword : TH_TEXT.auth.showPassword}
            onClick={() => setShowConfirm((v) => !v)}
          >
            <EyeIcon open={showConfirmPassword} />
          </button>
        }
      />

      {/* Submit */}
      <button
        type="submit"
        disabled={!isValid || isLoading}
        aria-busy={isLoading}
        className={[
          "mt-1 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5",
          "text-sm font-semibold tracking-wide text-white transition-all duration-200",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500",
          isValid && !isLoading
            ? "bg-violet-600 hover:bg-violet-700 active:scale-[0.98] shadow-lg shadow-violet-500/25"
            : "cursor-not-allowed bg-slate-300 dark:bg-slate-700 dark:text-slate-500",
        ].join(" ")}
      >
        {isLoading ? (
          <>
            <Spinner />
            <span>กำลังสมัครสมาชิก...</span>
          </>
        ) : (
          "สมัครสมาชิก"
        )}
      </button>

      {/* Login link */}
      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        มีบัญชีแล้ว?{" "}
        <Link
          href="/login"
          className="font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors"
        >
          เข้าสู่ระบบ
        </Link>
      </p>
    </form>
  );
}
