import type { Metadata } from "next";
import { TH_TEXT } from "@/constants/th";
import TransactionTemplatePage from "@/feature/transaction/components/TransactionTemplatePage";

export const metadata: Metadata = {
  title: TH_TEXT.transactionTemplate.metadataTitle,
  description: TH_TEXT.transactionTemplate.metadataDescription,
};

export default function Page() {
  return <TransactionTemplatePage />;
}
