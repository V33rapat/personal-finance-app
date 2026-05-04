import type { Metadata } from "next";
import { TH_TEXT } from "@/constants/th";
import WalletPage from "@/feature/wallet/components/WalletPage";

export const metadata: Metadata = {
  title: TH_TEXT.wallet.metadataTitle,
  description: TH_TEXT.wallet.metadataDescription,
};

export default function Page() {
  return <WalletPage />;
}
