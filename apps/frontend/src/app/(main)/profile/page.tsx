import type { Metadata } from "next";
import { TH_TEXT } from "@/constants/th";
import ProfilePageContent from "@/feature/auth/components/ProfilePageContent";

export const metadata: Metadata = {
  title: TH_TEXT.profile.metadataTitle,
  description: TH_TEXT.profile.metadataDescription,
};

export default function ProfilePage() {
  return <ProfilePageContent />;
}
