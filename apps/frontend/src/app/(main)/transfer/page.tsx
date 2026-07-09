import type { Metadata } from "next";
import { TH_TEXT } from "@/constants/th";
import TransferPage from "@/feature/transfer/components/TransferPage";

export const metadata: Metadata = {
  title: TH_TEXT.transfer.metadataTitle,
  description: TH_TEXT.transfer.metadataDescription,
};

export default function Page() {
  return <TransferPage />;
}
