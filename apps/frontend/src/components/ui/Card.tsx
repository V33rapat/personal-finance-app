import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export default function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={[
        "rounded-2xl border border-slate-200/80 bg-white/85 shadow-xl shadow-slate-200/50 backdrop-blur-xl",
        "dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-slate-950/40",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}
