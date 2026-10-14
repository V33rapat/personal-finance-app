"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { TH_TEXT } from "@/constants/th";
import { getAnnouncementGroups, getVisiblePopupAnnouncements } from "../lib/releaseAnnouncement";
import { createTabAnnouncementSession, type TabAnnouncementSession } from "../lib/tabAnnouncementSession";
import type {
  ReleaseAnnouncement,
  ReleaseAnnouncementPopupResponse,
} from "../types";
import ReleaseAnnouncementModal from "./ReleaseAnnouncementModal";

interface AnnouncementContextValue {
  markSeen: (releaseId: string) => Promise<boolean>;
}

const AnnouncementContext = createContext<AnnouncementContextValue | null>(null);
const POPUP_DELAY_MS = 650;
const ALLOWED_INTERNAL_ROUTES = new Set([
  "/allocation",
  "/dashboard",
  "/profile",
  "/spending-plans",
  "/transaction-templates",
  "/transactions",
  "/transfer",
  "/wallet",
  "/whats-new",
]);

function hasAnotherOpenDialog(): boolean {
  const hasDialog = Array.from(
    document.querySelectorAll<HTMLElement>("[role='dialog'], [aria-modal='true']"),
  ).some(
    (dialog) =>
      dialog.getAttribute("aria-hidden") !== "true" &&
      dialog.getClientRects().length > 0,
  );
  const activeElement = document.activeElement;
  const isEditing =
    activeElement instanceof HTMLElement &&
    activeElement.matches("input, textarea, select, [contenteditable='true']");
  return hasDialog || isEditing;
}

function isInternalPath(href: string): boolean {
  if (!href.startsWith("/") || href.startsWith("//") || href.includes("\\")) {
    return false;
  }
  try {
    return ALLOWED_INTERNAL_ROUTES.has(
      new URL(href, window.location.origin).pathname,
    );
  } catch {
    return false;
  }
}

async function sendReleaseIds(path: "seen" | "dismiss", releaseIds: string[]) {
  const response = await fetch(`/api/release-announcement/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ release_ids: releaseIds }),
    cache: "no-store",
  });
  return response.ok;
}

export function ReleaseAnnouncementProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [groups, setGroups] = useState<ReturnType<typeof getAnnouncementGroups>>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [seenErrorIds, setSeenErrorIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedForAll, setDismissedForAll] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const sessionRef = useRef<TabAnnouncementSession | null>(null);
  const snapshotIdsRef = useRef<string[]>([]);
  const savingRef = useRef(false);

  const markSeen = useCallback(async (releaseId: string): Promise<boolean> => {
    try {
      const succeeded = await sendReleaseIds("seen", [releaseId]);
      setSeenErrorIds((current) => {
        const next = new Set(current);
        if (succeeded) next.delete(releaseId);
        else next.add(releaseId);
        return next;
      });
      return succeeded;
    } catch {
      setSeenErrorIds((current) => new Set(current).add(releaseId));
      return false;
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    let popupTimer = 0;
    let localSession: TabAnnouncementSession | null = null;

    if (window.location.pathname === "/whats-new") {
      return () => controller.abort();
    }

    const loadPopup = async () => {
      try {
        const response = await fetch("/api/release-announcement/popup", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as ReleaseAnnouncementPopupResponse;
        if (!data.user_id || !Array.isArray(data.announcements)) return;

        localSession = await createTabAnnouncementSession();
        if (disposed) {
          localSession.dispose();
          return;
        }
        sessionRef.current = localSession;
        setUserId(data.user_id);

        const visible = getVisiblePopupAnnouncements(
          data.announcements,
          localSession.getSuppressedIds(data.user_id),
        );
        if (visible.length === 0) return;

        const nextGroups = getAnnouncementGroups(visible);
        const popupSnapshot = nextGroups.flatMap((group) => group.announcements);
        snapshotIdsRef.current = popupSnapshot.map(({ id }) => id);
        setGroups(nextGroups);
        setDismissedForAll(false);
        setCloseError(null);
        setSeenErrorIds(new Set());

        const latest = [...popupSnapshot].sort(
          (left, right) => right.release_order - left.release_order,
        )[0];
        if (latest) setExpandedIds(new Set([latest.id]));

        popupTimer = window.setTimeout(() => {
          if (
            disposed ||
            window.location.pathname === "/whats-new" ||
            hasAnotherOpenDialog()
          ) {
            return;
          }
          setIsOpen(true);
          if (latest) {
            window.requestAnimationFrame(() => {
              void markSeen(latest.id);
            });
          }
        }, POPUP_DELAY_MS);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          // A failed popup load must not interrupt the authenticated page.
        }
      }
    };

    void loadPopup();
    return () => {
      disposed = true;
      controller.abort();
      window.clearTimeout(popupTimer);
      localSession?.dispose();
      if (sessionRef.current === localSession) sessionRef.current = null;
    };
  }, [markSeen]);

  const closePopup = useCallback(async (): Promise<boolean> => {
    if (savingRef.current) return false;
    const snapshotIds = snapshotIdsRef.current;
    if (dismissedForAll && userId && snapshotIds.length > 0) {
      savingRef.current = true;
      setIsSaving(true);
      setCloseError(null);
      try {
        const succeeded = await sendReleaseIds("dismiss", snapshotIds);
        if (!succeeded) {
          setCloseError(TH_TEXT.releaseAnnouncement.dismissFailed);
          return false;
        }
      } catch {
        setCloseError(TH_TEXT.releaseAnnouncement.dismissFailed);
        return false;
      } finally {
        savingRef.current = false;
        setIsSaving(false);
      }
    } else if (userId) {
      sessionRef.current?.suppress(userId, snapshotIds);
    }

    setIsOpen(false);
    setCloseError(null);
    return true;
  }, [dismissedForAll, userId]);

  const toggleAnnouncement = useCallback((announcement: ReleaseAnnouncement) => {
    const wasExpanded = expandedIds.has(announcement.id);
    setExpandedIds((current) => {
      const next = new Set(current);
      if (wasExpanded) next.delete(announcement.id);
      else next.add(announcement.id);
      return next;
    });
    if (!wasExpanded) void markSeen(announcement.id);
  }, [expandedIds, markSeen]);

  const retrySeen = useCallback((announcement: ReleaseAnnouncement) => {
    void markSeen(announcement.id);
  }, [markSeen]);

  const navigateToFeature = useCallback(async (
    announcement: ReleaseAnnouncement,
    href: string,
  ) => {
    if (!isInternalPath(href) || isSaving) return;
    await markSeen(announcement.id);
    if (await closePopup()) router.push(href);
  }, [closePopup, isSaving, markSeen, router]);

  const contextValue = useMemo(() => ({ markSeen }), [markSeen]);

  return (
    <AnnouncementContext.Provider value={contextValue}>
      {children}
      <ReleaseAnnouncementModal
        open={isOpen}
        groups={groups}
        expandedIds={expandedIds}
        dismissedForAll={dismissedForAll}
        saving={isSaving}
        error={closeError}
        seenErrorIds={seenErrorIds}
        onDismissForAllChange={setDismissedForAll}
        onClose={() => void closePopup()}
        onToggle={toggleAnnouncement}
        onNavigate={(announcement, href) => void navigateToFeature(announcement, href)}
        onRetrySeen={retrySeen}
      />
    </AnnouncementContext.Provider>
  );
}

export function useReleaseAnnouncementContext(): AnnouncementContextValue {
  const context = useContext(AnnouncementContext);
  if (!context) throw new Error("Release announcements are unavailable outside the authenticated layout");
  return context;
}
