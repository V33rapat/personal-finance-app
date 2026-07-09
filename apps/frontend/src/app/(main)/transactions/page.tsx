import type { Metadata } from "next";
import { TH_TEXT } from "@/constants/th";
import TransactionsPageContent from "@/feature/transaction/components/TransactionsPageContent";

export const metadata: Metadata = {
  title: TH_TEXT.transaction.metadataTitle,
  description: TH_TEXT.transaction.metadataDescription,
};

export default function TransactionsPage() {
  return <TransactionsPageContent />;
}
