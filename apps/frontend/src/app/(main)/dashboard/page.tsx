import type { Metadata } from "next";
import { TH_TEXT } from "@/constants/th";
import DashboardPageContent from "@/feature/dashboard/components/DashboardPageContent";

export const metadata: Metadata = {
  title: TH_TEXT.dashboard.metadataTitle,
  description: TH_TEXT.dashboard.metadataDescription,
};

export default function DashboardPage() {
  return <DashboardPageContent />;
}
