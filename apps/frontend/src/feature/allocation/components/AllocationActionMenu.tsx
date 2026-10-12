"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { TH_TEXT } from "@/constants/th";

interface AllocationActionMenuProps {
  label: string;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export default function AllocationActionMenu({
  label,
  disabled,
  onEdit,
  onDelete,
}: AllocationActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    menuRef.current?.querySelector<HTMLButtonElement>("[role='menuitem']")?.focus();

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [isOpen]);

  const closeAndRestoreFocus = () => {
    setIsOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']") ?? [],
    );
    const activeIndex = items.indexOf(document.activeElement as HTMLButtonElement);

    if (event.key === "Escape") {
      event.preventDefault();
      closeAndRestoreFocus();
      return;
    }

    let nextIndex: number | null = null;
    if (event.key === "ArrowDown") nextIndex = (activeIndex + 1) % items.length;
    if (event.key === "ArrowUp") nextIndex = (activeIndex - 1 + items.length) % items.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = items.length - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      items[nextIndex]?.focus();
    }
  };

  const runAction = (action: () => void) => {
    closeAndRestoreFocus();
    action();
  };

  return (
    <div ref={rootRef} className="relative flex justify-end">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title={label}
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-11 z-30 min-w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(onEdit)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 outline-none hover:bg-slate-100 focus:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            {TH_TEXT.allocation.editAction}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(onDelete)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 outline-none hover:bg-red-50 focus:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 dark:focus:bg-red-950/40"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {TH_TEXT.allocation.deleteAction}
          </button>
        </div>
      )}
    </div>
  );
}
