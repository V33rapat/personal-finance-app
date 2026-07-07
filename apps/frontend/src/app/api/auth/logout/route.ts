import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  if (token && backendUrl) {
    await fetch(`${backendUrl}/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }).catch(() => null);
  }

  return response;
}
