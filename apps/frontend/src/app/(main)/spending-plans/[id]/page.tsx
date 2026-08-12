import type { Metadata } from "next";
import SpendingPlanDetailPage from "@/feature/spending-plan/components/SpendingPlanDetailPage";

export const metadata: Metadata = {
  title: "แผนการใช้เงิน | Walpaca",
};

export default function Page() {
  return <SpendingPlanDetailPage />;
}
