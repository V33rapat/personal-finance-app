import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getBackendUrl } from "@/app/api/_lib/bff";

function clearAuthCookies(response: NextResponse) {
  response.cookies.set("accessToken", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set("refreshToken", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

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
