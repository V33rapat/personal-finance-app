"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@/components/ui/Button";

export default function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  return (
    <Button
      type="button"
      variant="danger"
      onClick={handleLogout}
      disabled={isLoggingOut}
    >
      {isLoggingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
    </Button>
  );
}
