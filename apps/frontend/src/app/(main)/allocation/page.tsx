import type { Metadata } from "next";
import { TH_TEXT } from "@/constants/th";
import AllocationPage from "@/feature/allocation/components/AllocationPage";

export const metadata: Metadata = {
  title: TH_TEXT.allocation.metadataTitle,
  description: TH_TEXT.allocation.metadataDescription,
};

export default function Page() {
  return <AllocationPage />;
}
