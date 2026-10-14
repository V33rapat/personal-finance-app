"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { TH_TEXT } from "@/constants/th";
import Button from "@/components/ui/Button";
import { formatAnnouncementText, type ReleaseAnnouncementGroup } from "../lib/releaseAnnouncement";
import type { ReleaseAnnouncement } from "../types";
import ReleaseAnnouncementList from "./ReleaseAnnouncementList";

interface ReleaseAnnouncementModalProps {
  open: boolean;
  groups: ReleaseAnnouncementGroup[];
  expandedIds: Set<string>;
  dismissedForAll: boolean;
  saving: boolean;
  error: string | null;
  seenErrorIds: Set<string>;
  onDismissForAllChange: (checked: boolean) => void;
  onClose: () => void;
  onToggle: (announcement: ReleaseAnnouncement) => void;
  onNavigate: (announcement: ReleaseAnnouncement, href: string) => void;
  onRetrySeen: (announcement: ReleaseAnnouncement) => void;
}

export default function ReleaseAnnouncementModal(props: ReleaseAnnouncementModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const handlersRef = useRef({ onClose: props.onClose, saving: props.saving });
  const titleId = "release-announcement-popup-title";
  const descriptionId = "release-announcement-popup-description";
  const count = props.groups.reduce((sum, group) => sum + group.announcements.length, 0);

  useEffect(() => {
    handlersRef.current = { onClose: props.onClose, saving: props.saving };
  }, [props.onClose, props.saving]);

  useEffect(() => {
    if (!props.open) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!handlersRef.current.saving) handlersRef.current.onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = document.getElementById(titleId)?.closest("[role='dialog']");
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), a[href]:not([aria-disabled='true']), [tabindex]:not([tabindex='-1'])",
        ),
      ).filter((element) => element.getClientRects().length > 0);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [props.open]);

  if (!props.open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="flex max-h-[min(90dvh,820px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
          <div>
            <h2 id={titleId} className="text-lg font-bold text-slate-900 dark:text-slate-50">
              {TH_TEXT.releaseAnnouncement.popupTitle}
            </h2>
            <p id={descriptionId} className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {TH_TEXT.releaseAnnouncement.popupDescription}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label={TH_TEXT.releaseAnnouncement.closePopup}
            disabled={props.saving}
            onClick={props.onClose}
            className="rounded-lg p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-50"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div data-testid="release-announcement-scroll-area" className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <ReleaseAnnouncementList
            groups={props.groups}
            expandedIds={props.expandedIds}
            disabled={props.saving}
            seenErrorIds={props.seenErrorIds}
            onToggle={props.onToggle}
            onNavigate={props.onNavigate}
            onRetrySeen={props.onRetrySeen}
          />
        </div>

        <footer className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60 sm:px-6">
          {props.error && (
            <p role="alert" className="mb-3 text-sm font-medium text-red-700 dark:text-red-300">
              {props.error}
            </p>
          )}
          <label className="flex cursor-pointer items-start gap-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <input
              type="checkbox"
              checked={props.dismissedForAll}
              disabled={props.saving}
              onChange={(event) => props.onDismissForAllChange(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-violet-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
            />
            <span>{TH_TEXT.releaseAnnouncement.dismissThisVersion}</span>
          </label>
          <p className="ml-7 mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {formatAnnouncementText(
              TH_TEXT.releaseAnnouncement.popupSaveHint,
              String(count),
            )}
          </p>
          <div className="mt-4 flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              disabled={props.saving}
              onClick={props.onClose}
              aria-label={TH_TEXT.releaseAnnouncement.close}
            >
              {props.saving ? TH_TEXT.common.loading : TH_TEXT.releaseAnnouncement.close}
            </Button>
          </div>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
