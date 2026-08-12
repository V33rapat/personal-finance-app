import type { Metadata } from "next";
import NewSpendingPlanPage from "@/feature/spending-plan/components/NewSpendingPlanPage";

export const metadata: Metadata = {
  title: "สร้างแผนการใช้เงิน | Walpaca",
};

export default function Page() {
  return <NewSpendingPlanPage />;
}
