import { NextRequest, NextResponse } from "next/server";
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

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = await getAuthHeader();

    if (!authHeader) {
      return unauthorizedResponse();
    }

    const body = await request.json().catch(() => null);

    if (typeof body?.fullName !== "string") {
      return NextResponse.json(
        { message: "Full name is required" },
        { status: 400 },
      );
    }

    const response = await fetch(`${getBackendUrl()}/auth/profile`, {
      method: "PATCH",
      headers: {
        ...authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ full_name: body.fullName }),
      cache: "no-store",
    });
    const data = await readJson(response);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message ?? "Failed to update profile" },
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
