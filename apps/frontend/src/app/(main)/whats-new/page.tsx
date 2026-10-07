import type { Metadata } from "next";
import { TH_TEXT } from "@/constants/th";
import ReleaseAnnouncementHistoryPage from "@/feature/release-announcement/components/ReleaseAnnouncementHistoryPage";

export const metadata: Metadata = {
  title: TH_TEXT.releaseAnnouncement.metadataTitle,
};

export default function WhatsNewPage() {
  return <ReleaseAnnouncementHistoryPage />;
}
