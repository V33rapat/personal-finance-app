import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/app/api/_lib/bff";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(`${getBackendUrl()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ message: data.message }, { status: res.status });
    }

    const response = NextResponse.json(data, { status: res.status });
    const accessToken = data.accessToken ?? data.access_token;
    const refreshToken = data.refreshToken ?? data.refresh_token;

    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;

  } catch {
    return NextResponse.json(
      { message: "เซิร์ฟเวอร์ไม่พร้อมใช้งาน" },
      { status: 500 }
    );
  }
}
