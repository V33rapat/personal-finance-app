"use client";

import { ArrowUpRight, ChevronDown, ChevronUp } from "lucide-react";
import { TH_TEXT } from "@/constants/th";
import {
  formatAnnouncementText,
  formatReleaseDate,
  type ReleaseAnnouncementGroup,
} from "../lib/releaseAnnouncement";
import type { ReleaseAnnouncement, ReleaseUpdateKind } from "../types";

const UPDATE_LABELS: Record<ReleaseUpdateKind, string> = {
  features: TH_TEXT.releaseAnnouncement.features,
  improvements: TH_TEXT.releaseAnnouncement.improvements,
  fixes: TH_TEXT.releaseAnnouncement.fixes,
};

interface ReleaseAnnouncementListProps {
  groups: ReleaseAnnouncementGroup[];
  expandedIds: Set<string>;
  disabled?: boolean;
  seenErrorIds?: Set<string>;
  onToggle: (announcement: ReleaseAnnouncement) => void;
  onNavigate: (announcement: ReleaseAnnouncement, href: string) => void;
  onRetrySeen?: (announcement: ReleaseAnnouncement) => void;
}

export default function ReleaseAnnouncementList({
  groups,
  expandedIds,
  disabled = false,
  seenErrorIds = new Set<string>(),
  onToggle,
  onNavigate,
  onRetrySeen,
}: ReleaseAnnouncementListProps) {
  const labels = {
    new: TH_TEXT.releaseAnnouncement.newGroup,
    seen: TH_TEXT.releaseAnnouncement.seenGroup,
    dismissed: TH_TEXT.releaseAnnouncement.dismissedGroup,
  };

  return (
    <div className="space-y-6" data-testid="release-announcement-list">
      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`release-group-${group.key}`}>
          <h3
            id={`release-group-${group.key}`}
            className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300"
          >
            {labels[group.key]}
          </h3>
          <div className="space-y-3">
            {group.announcements.map((announcement) => (
              <ReleaseAnnouncementCard
                key={announcement.id}
                announcement={announcement}
                expanded={expandedIds.has(announcement.id)}
                disabled={disabled}
                seenWriteFailed={seenErrorIds.has(announcement.id)}
                onToggle={() => onToggle(announcement)}
                onNavigate={(href) => onNavigate(announcement, href)}
                onRetrySeen={() => onRetrySeen?.(announcement)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ReleaseAnnouncementCard({
  announcement,
  expanded,
  disabled,
  seenWriteFailed,
  onToggle,
  onNavigate,
  onRetrySeen,
}: {
  announcement: ReleaseAnnouncement;
  expanded: boolean;
  disabled: boolean;
  seenWriteFailed: boolean;
  onToggle: () => void;
  onNavigate: (href: string) => void;
  onRetrySeen: () => void;
}) {
  const detailId = `release-details-${announcement.id}`;
  const status = announcement.dismissed_at
    ? TH_TEXT.releaseAnnouncement.dismissedGroup
    : announcement.display_state === "new"
      ? TH_TEXT.releaseAnnouncement.newGroup
      : TH_TEXT.releaseAnnouncement.seenGroup;

  return (
    <article
      data-testid={`release-announcement-${announcement.id}`}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={detailId}
        disabled={disabled}
        aria-label={formatAnnouncementText(
          expanded
            ? TH_TEXT.releaseAnnouncement.hideDetails
            : TH_TEXT.releaseAnnouncement.showDetails,
          announcement.version,
        )}
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 p-4 text-left transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 dark:hover:bg-slate-800/70"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-slate-900 dark:text-slate-50">
              {announcement.title}
            </span>
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">
              {TH_TEXT.releaseAnnouncement.version} {announcement.version}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {status}
            </span>
          </span>
          <span className="mt-1 block text-sm leading-6 text-slate-600 dark:text-slate-300">
          {announcement.summary}
          </span>
          <span className="mt-2 block text-xs text-slate-500 dark:text-slate-400">
            {TH_TEXT.releaseAnnouncement.publishedAt}: {formatReleaseDate(announcement.published_at)}
          </span>
        </span>
        <span className="mt-1 shrink-0 text-slate-500" aria-hidden>
          {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </span>
      </button>

      {expanded && (
        <div
          id={detailId}
          className="space-y-4 border-t border-slate-200 px-4 py-4 dark:border-slate-800"
        >
          {seenWriteFailed && (
            <p className="flex flex-wrap items-center gap-2 text-sm text-red-700 dark:text-red-300">
              <span>{TH_TEXT.releaseAnnouncement.markSeenFailed}</span>
              <button
                type="button"
                onClick={onRetrySeen}
                disabled={disabled}
                className="font-semibold underline underline-offset-2 disabled:opacity-50"
              >
                {TH_TEXT.common.retry}
              </button>
            </p>
          )}
          {(Object.keys(UPDATE_LABELS) as ReleaseUpdateKind[]).map((kind) => {
            const updates = announcement.updates[kind];
            if (updates.length === 0) return null;

            return (
              <section key={kind}>
                <h4 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {UPDATE_LABELS[kind]}
                </h4>
                <ul className="space-y-2">
                  {updates.map((update, index) => (
                    <li
                      key={`${kind}-${index}`}
                      className="flex items-start gap-2 text-sm leading-6 text-slate-600 dark:text-slate-300"
                    >
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" aria-hidden />
                      <span className="min-w-0 flex-1">
                        {update.text}
                        {update.href && (
                          <a
                            href={update.href}
                            aria-disabled={disabled || undefined}
                            onClick={(event) => {
                              event.preventDefault();
                              if (disabled) return;
                              onNavigate(update.href!);
                            }}
                            className="ml-2 inline-flex items-center gap-1 font-semibold text-violet-700 underline decoration-violet-300 underline-offset-2 hover:text-violet-900 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:text-violet-300 dark:hover:text-violet-200"
                          >
                            {TH_TEXT.releaseAnnouncement.updateLink}
                            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                          </a>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </article>
  );
}
