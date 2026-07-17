import { NextRequest, NextResponse } from "next/server";
import {
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  unauthorizedResponse,
} from "@/app/api/_lib/bff";
import { clearAuthCookies } from "../../_lib/auth-cookies";

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = await getAuthHeader();

    if (!authHeader) {
      return unauthorizedResponse();
    }

    const body = await request.json().catch(() => null);
    if (typeof body?.currentPassword !== "string" || typeof body?.newPassword !== "string") {
      return NextResponse.json({ message: "Password is required" }, { status: 400 });
    }

    const response = await fetch(`${getBackendUrl()}/auth/profile/password`, {
      method: "PATCH",
      headers: {
        ...authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        current_password: body.currentPassword,
        new_password: body.newPassword,
      }),
      cache: "no-store",
    });
    const data = await readJson(response);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message ?? "Failed to change password" },
        { status: response.status },
      );
    }

    const result = NextResponse.json(
      { message: data?.message ?? "Password changed successfully" },
      { status: response.status },
    );
    clearAuthCookies(result);
    return result;
  } catch {
    return serverNotReadyResponse();
  }
}
