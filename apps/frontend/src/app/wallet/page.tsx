import type { Metadata } from "next";
import WalletPage from "@/feature/wallet/components/WalletPage";

export const metadata: Metadata = {
  title: "Wallets | Walpaca",
  description: "Manage wallets and sub-wallets in Walpaca.",
};

export default function Page() {
  return <WalletPage />;
}
