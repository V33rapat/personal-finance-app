// ---------------------------------------------------------------------------
// hooks/useRegisterForm.ts
// แยก business logic ออกจาก UI component ทั้งหมด
// ---------------------------------------------------------------------------

"use client";

import { useState, useCallback, useMemo } from "react";
import type { RegisterFormData, RegisterFormErrors } from "@/types/auth";
import { validateRegisterForm, isFormValid } from "@/lib/validation";

type SubmitStatus = "idle" | "loading" | "success" | "error";

interface UseRegisterFormReturn {
  formData: RegisterFormData;
  errors: RegisterFormErrors;
  submitStatus: SubmitStatus;
  apiMessage: string;
  isValid: boolean;
  handleChange: (field: keyof RegisterFormData, value: string) => void;
  handleBlur: (field: keyof RegisterFormData) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

const INITIAL_FORM: RegisterFormData = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export function useRegisterForm(): UseRegisterFormReturn {
  const [formData, setFormData] = useState<RegisterFormData>(INITIAL_FORM);
  const [touched, setTouched]   = useState<Partial<Record<keyof RegisterFormData, boolean>>>({});
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [apiMessage, setApiMessage]     = useState("");

  // Validate ทุกครั้งที่ formData เปลี่ยน แต่แสดงเฉพาะ field ที่ touched แล้ว
  const allErrors = useMemo(() => validateRegisterForm(formData), [formData]);
  const errors: RegisterFormErrors = useMemo(() => {
    const visible: RegisterFormErrors = {};
    (Object.keys(allErrors) as (keyof RegisterFormErrors)[]).forEach((key) => {
      if (touched[key]) visible[key] = allErrors[key];
    });
    return visible;
  }, [allErrors, touched]);

  const isValid = useMemo(() => isFormValid(allErrors, formData), [allErrors, formData]);

  const handleChange = useCallback((field: keyof RegisterFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleBlur = useCallback((field: keyof RegisterFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched เพื่อแสดง error ทั้งหมด
    setTouched({ username: true, email: true, password: true, confirmPassword: true });

    if (!isFormValid(validateRegisterForm(formData), formData)) return;

    setSubmitStatus("loading");
    setApiMessage("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      });

      const body = await res.json();

      if (res.ok) {
        setSubmitStatus("success");
        setApiMessage(body.message ?? "สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลของคุณ");
        setFormData(INITIAL_FORM);
        setTouched({});
      } else {
        setSubmitStatus("error");
        setApiMessage(body.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      }
    } catch {
      setSubmitStatus("error");
      setApiMessage("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
    }
  }, [formData]);

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