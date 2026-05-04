import type { Metadata } from "next";
import { TH_TEXT } from "@/constants/th";
import TransactionsPageContent from "@/feature/transaction/components/TransactionsPageContent";

export const metadata: Metadata = {
  title: TH_TEXT.transaction.metadataTitle,
  description: TH_TEXT.transaction.metadataDescription,
};

const mockWallets = [
  { id: "wallet-savings", name: "เงินออม" },
  { id: "wallet-travel", name: "ท่องเที่ยว" },
  { id: "wallet-emergency", name: "ฉุกเฉิน" },
  { id: "wallet-investment", name: "ลงทุน" },
];

export default function TransactionsPage() {
  return <TransactionsPageContent wallets={mockWallets} />;
}