import type { Metadata } from "next";
import SpendingPlansPage from "@/feature/spending-plan/components/SpendingPlansPage";

export const metadata: Metadata = {
  title: "แผนการใช้เงิน | Walpaca",
  description: "วางแผนและติดตามค่าใช้จ่ายรายวันใน Walpaca",
};

export default function Page() {
  return <SpendingPlansPage />;
}
