"use client";

import { useEffect, useRef, useState } from "react";
import { BookmarkPlus, Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { TH_TEXT } from "@/constants/th";
import type { Transaction } from "./TransactionItem";
import { getTransactionActionIds } from "../lib/transactionActions";

interface TransactionActionMenuProps {
  transaction: Transaction;
  onEdit?: (transaction: Transaction) => void;
  onDuplicate?: (transaction: Transaction) => void;
  onSaveAsTemplate?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  isSavingTemplate?: boolean;
}

interface MenuAction {
  id: string;
  label: string;
  icon: typeof Pencil;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
}

export default function TransactionActionMenu({
  transaction,
  onEdit,
  onDuplicate,
  onSaveAsTemplate,
  onDelete,
  isSavingTemplate = false,
}: TransactionActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) firstItemRef.current?.focus();
  }, [isOpen]);

  if (getTransactionActionIds(transaction).length === 0) return null;

  const actions = ([
    onEdit
      ? {
          id: "edit",
          label: TH_TEXT.transaction.editTransaction,
          icon: Pencil,
          onSelect: () => onEdit(transaction),
        }
      : null,
    onDuplicate
      ? {
          id: "duplicate",
          label: TH_TEXT.transaction.duplicateTransaction,
          icon: Copy,
          onSelect: () => onDuplicate(transaction),
        }
      : null,
    onSaveAsTemplate
      ? {
          id: "template",
          label: TH_TEXT.transactionTemplate.saveFromTransaction,
          icon: BookmarkPlus,
          onSelect: () => onSaveAsTemplate(transaction),
          disabled: isSavingTemplate,
        }
      : null,
    onDelete
      ? {
          id: "delete",
          label: TH_TEXT.transaction.deleteTransaction,
          icon: Trash2,
          onSelect: () => onDelete(transaction),
          danger: true,
        }
      : null,
  ] as Array<MenuAction | null>).filter(
    (action): action is MenuAction => action !== null,
  );

  if (actions.length === 0) return null;

  const closeAndFocusTrigger = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const selectAction = (action: MenuAction) => {
    if (action.disabled) return;
    closeAndFocusTrigger();
    action.onSelect();
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = actions.findIndex(
      (action) => action.id === event.currentTarget.dataset.actionId,
    );

    if (event.key === "Escape") {
      event.preventDefault();
      closeAndFocusTrigger();
      return;
    }

    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") {
      return;
    }

    event.preventDefault();
    const menuItems = Array.from(
      containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
    );

    if (event.key === "Home") {
      menuItems[0]?.focus();
      return;
    }

    if (event.key === "End") {
      menuItems.at(-1)?.focus();
      return;
    }

    const nextIndex = event.key === "ArrowDown"
      ? (currentIndex + 1) % menuItems.length
      : (currentIndex - 1 + menuItems.length) % menuItems.length;
    menuItems[nextIndex]?.focus();
  };

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`${TH_TEXT.transaction.actionMenu}: ${transaction.name}`}
        title={TH_TEXT.transaction.actionMenu}
        data-testid="transaction-action-menu-trigger"
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !isOpen) {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
        className="rounded-lg p-1.5 text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-600 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-500 group-hover:opacity-100 dark:hover:bg-slate-800 dark:hover:text-slate-300"
      >
        <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label={`${TH_TEXT.transaction.actionMenu}: ${transaction.name}`}
          data-testid="transaction-action-menu"
          className="absolute right-0 top-full z-30 mt-1 min-w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30"
        >
          {actions.map((action, index) => {
            const Icon = action.icon;

            return (
              <button
                key={action.id}
                ref={index === 0 ? firstItemRef : undefined}
                type="button"
                role="menuitem"
                data-action-id={action.id}
                data-testid={`transaction-action-${action.id}`}
                disabled={action.disabled}
                onClick={() => selectAction(action)}
                onKeyDown={handleMenuKeyDown}
                className={[
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  action.danger
                    ? "text-red-600 hover:bg-red-50 focus-visible:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 dark:focus-visible:bg-red-950/30"
                    : "text-slate-700 hover:bg-slate-100 focus-visible:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800",
                  action.danger && index > 0 ? "mt-1 border-t border-slate-100 pt-3 dark:border-slate-800" : "",
                ].join(" ")}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
