import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getBackendUrl } from "@/app/api/_lib/bff";
import { clearAuthCookies } from "../_lib/auth-cookies";

export async function POST() {
  const response = NextResponse.json({ message: "Logout successful" });
  clearAuthCookies(response);

  const token = (await cookies()).get("accessToken")?.value;
  if (token) {
    await fetch(`${getBackendUrl()}/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }).catch(() => null);
  }

  return response;
}
