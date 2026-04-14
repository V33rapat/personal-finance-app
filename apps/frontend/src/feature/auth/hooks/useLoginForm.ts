// ---------------------------------------------------------------------------
// hooks/useLoginForm.ts
// Login form logic
// ---------------------------------------------------------------------------

"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { LoginFormData, LoginFormErrors } from "../types/login";
import { validateLoginForm, isLoginFormValid } from "../lib/loginValidation";

type SubmitStatus = "idle" | "loading" | "success" | "error";

interface UseLoginFormReturn {
  formData: LoginFormData;
  errors: LoginFormErrors;
  submitStatus: SubmitStatus;
  apiMessage: string;
  isValid: boolean;
  handleChange: (field: keyof LoginFormData, value: string) => void;
  handleBlur: (field: keyof LoginFormData) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

const INITIAL_FORM: LoginFormData = {
  email: "",
  password: "",
};

export function useLoginForm(): UseLoginFormReturn {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginFormData>(INITIAL_FORM);
  const [touched, setTouched] = useState<Partial<Record<keyof LoginFormData, boolean>>>({});
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [apiMessage, setApiMessage] = useState("");

  const allErrors = useMemo(() => validateLoginForm(formData), [formData]);
  const errors: LoginFormErrors = useMemo(() => {
    const visible: LoginFormErrors = {};
    (Object.keys(allErrors) as (keyof LoginFormErrors)[]).forEach((key) => {
      if (touched[key]) visible[key] = allErrors[key];
    });
    return visible;
  }, [allErrors, touched]);

  const isValid = useMemo(() => isLoginFormValid(allErrors, formData), [allErrors, formData]);

  const handleChange = useCallback((field: keyof LoginFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleBlur = useCallback((field: keyof LoginFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({ email: true, password: true });

    if (!isLoginFormValid(validateLoginForm(formData), formData)) return;

    setSubmitStatus("loading");
    setApiMessage("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      });

      const body = await res.json();

      if (res.ok) {
        setSubmitStatus("success");
        setApiMessage(body.message ?? "เข้าสู่ระบบสำเร็จ!");

        setTimeout(() => router.push("/dashboard"), 1500);
      } else {
        setSubmitStatus("error");
        setApiMessage(body.message ?? "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      }
    } catch {
      setSubmitStatus("error");
      setApiMessage("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
    }
  }, [formData, router]);

  return {
    formData,
    errors,
    submitStatus,
    apiMessage,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
  };
}