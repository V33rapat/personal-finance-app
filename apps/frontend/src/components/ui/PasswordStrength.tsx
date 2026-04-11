// ---------------------------------------------------------------------------
// components/ui/PasswordStrength.tsx
// แสดง visual indicator ความแข็งแกร่งของ password (4 bars)
// ---------------------------------------------------------------------------

"use client";

import { getPasswordStrength } from "../../feature/auth/lib/validation";

interface PasswordStrengthProps {
  password: string;
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  const { score, label, color } = getPasswordStrength(password);

  if (!password) return null;

  return (
    <div className="flex items-center gap-2 -mt-1">
      <div className="flex flex-1 gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={[
              "h-1 flex-1 rounded-full transition-all duration-300",
              i < score ? color : "bg-slate-200 dark:bg-slate-700",
            ].join(" ")}
          />
        ))}
      </div>
      <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0 w-16 text-right">
        {label}
      </span>
    </div>
  );
}