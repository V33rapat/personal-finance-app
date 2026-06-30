import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export function getBackendUrl() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  if (!backendUrl) {
    throw new Error("NEXT_PUBLIC_BACKEND_URL is not configured");
  }

  return backendUrl;
}

export async function getAuthHeader() {
  const token = (await cookies()).get("accessToken")?.value;

  if (!token) {
    return null;
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function readJson(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export function unauthorizedResponse() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

export function serverNotReadyResponse() {
  return NextResponse.json(
    { message: "Server is not ready" },
    { status: 500 }
  );
}
