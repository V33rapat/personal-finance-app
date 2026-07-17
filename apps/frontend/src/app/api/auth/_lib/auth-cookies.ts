import { NextResponse } from "next/server";

export function clearAuthCookies(response: NextResponse) {
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };

  response.cookies.set("accessToken", "", options);
  response.cookies.set("refreshToken", "", options);
}
