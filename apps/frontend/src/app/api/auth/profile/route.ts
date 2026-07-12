import { NextResponse } from "next/server";
import {
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  unauthorizedResponse,
} from "@/app/api/_lib/bff";

export async function GET() {
  try {
    const authHeader = await getAuthHeader();

    if (!authHeader) {
      return unauthorizedResponse();
    }

    const response = await fetch(`${getBackendUrl()}/auth/profile`, {
      method: "POST",
      headers: authHeader,
      cache: "no-store",
    });
    const data = await readJson(response);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message ?? "Failed to load profile" },
        { status: response.status },
      );
    }

    return NextResponse.json(
      {
        fullName: data?.fullName,
        email: data?.email,
      },
      { status: response.status },
    );
  } catch {
    return serverNotReadyResponse();
  }
}
