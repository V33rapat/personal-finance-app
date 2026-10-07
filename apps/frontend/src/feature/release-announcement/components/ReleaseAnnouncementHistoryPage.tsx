"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TH_TEXT } from "@/constants/th";
import Button from "@/components/ui/Button";
import { useReleaseAnnouncementContext } from "./ReleaseAnnouncementProvider";
import { getAnnouncementGroups } from "../lib/releaseAnnouncement";
import type { ReleaseAnnouncement } from "../types";
import ReleaseAnnouncementList from "./ReleaseAnnouncementList";

interface HistoryResponse {
  announcements: ReleaseAnnouncement[];
}

function isInternalPath(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//") && !href.includes("\\");
}

export default function ReleaseAnnouncementHistoryPage() {
  const router = useRouter();
  const { markSeen } = useReleaseAnnouncementContext();
  const [announcements, setAnnouncements] = useState<ReleaseAnnouncement[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [seenErrorIds, setSeenErrorIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/release-announcement/history", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("history request failed");
        return (await response.json()) as HistoryResponse;
      })
      .then((data) => {
        setAnnouncements(Array.isArray(data.announcements) ? data.announcements : []);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setHasError(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [retryKey]);

  const toggleAnnouncement = useCallback((announcement: ReleaseAnnouncement) => {
    const opening = !expandedIds.has(announcement.id);
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(announcement.id)) next.delete(announcement.id);
      else next.add(announcement.id);
      return next;
    });
    if (!opening) return;

    void markSeen(announcement.id).then((succeeded) => {
      setSeenErrorIds((current) => {
        const next = new Set(current);
        if (succeeded) next.delete(announcement.id);
        else next.add(announcement.id);
        return next;
      });
      if (succeeded) {
        setAnnouncements((current) => current.map((item) => item.id === announcement.id
          ? { ...item, seen_at: item.seen_at ?? new Date().toISOString(), display_state: "seen" }
          : item));
      }
    });
  }, [expandedIds, markSeen]);

  const retrySeen = useCallback((announcement: ReleaseAnnouncement) => {
    void markSeen(announcement.id).then((succeeded) => {
      setSeenErrorIds((current) => {
        const next = new Set(current);
        if (succeeded) next.delete(announcement.id);
        else next.add(announcement.id);
        return next;
      });
      if (succeeded) {
        setAnnouncements((current) => current.map((item) => item.id === announcement.id
          ? { ...item, seen_at: item.seen_at ?? new Date().toISOString(), display_state: "seen" }
          : item));
      }
    });
  }, [markSeen]);

  const navigateToFeature = useCallback(async (
    announcement: ReleaseAnnouncement,
    href: string,
  ) => {
    if (!isInternalPath(href)) return;
    await markSeen(announcement.id);
    router.push(href);
  }, [markSeen, router]);

  const groups = getAnnouncementGroups(announcements, true);

  return (
    <div className="space-y-6" data-testid="release-announcement-history">
      <header>
        <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
          {TH_TEXT.navigation.whatsNew}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">
          {TH_TEXT.releaseAnnouncement.title}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {TH_TEXT.releaseAnnouncement.subtitle}
        </p>
      </header>

      {isLoading && (
        <p role="status" className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          {TH_TEXT.common.loading}...
        </p>
      )}

      {hasError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900/60 dark:bg-red-950/20">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            {TH_TEXT.releaseAnnouncement.loadFailed}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setIsLoading(true);
              setHasError(false);
              setRetryKey((key) => key + 1);
            }}
          >
            {TH_TEXT.common.retry}
          </Button>
        </div>
      )}

      {!isLoading && !hasError && announcements.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {TH_TEXT.releaseAnnouncement.emptyTitle}
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {TH_TEXT.releaseAnnouncement.emptyDescription}
          </p>
        </div>
      )}

      {!isLoading && !hasError && announcements.length > 0 && (
        <ReleaseAnnouncementList
          groups={groups}
          expandedIds={expandedIds}
          seenErrorIds={seenErrorIds}
          onToggle={toggleAnnouncement}
          onNavigate={(announcement, href) => void navigateToFeature(announcement, href)}
          onRetrySeen={retrySeen}
        />
      )}
    </div>
  );
}
