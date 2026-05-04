"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface SidebarItemProps {
  href: string;
  label: string;
  icon: ReactNode;
}

export default function SidebarItem({ href, label, icon }: SidebarItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={[
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
        isActive
          ? "bg-violet-50 text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-900/60"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition",
          isActive
            ? "bg-white text-violet-600 shadow-sm dark:bg-violet-900/50 dark:text-violet-200"
            : "bg-slate-100 text-slate-500 group-hover:text-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:text-slate-100",
        ].join(" ")}
      >
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}
