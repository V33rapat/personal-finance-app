import { NextRequest, NextResponse } from "next/server";
import {
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  unauthorizedResponse,
} from "@/app/api/_lib/bff";
import { toProfileResponse } from "../profile-bff";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function backendError(response: Response, data: unknown, fallback: string) {
  const message = (data as { message?: unknown } | null)?.message;

  return NextResponse.json(
    { message: typeof message === "string" ? message : fallback },
    { status: response.status },
  );
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = await getAuthHeader();

    if (!authHeader) {
      return unauthorizedResponse();
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Avatar file is required" }, { status: 400 });
    }

    if (file.size > MAX_AVATAR_SIZE || !ALLOWED_AVATAR_TYPES.has(file.type)) {
      return NextResponse.json(
        { message: "Avatar must be a JPG, PNG, or WebP image up to 5 MB." },
        { status: 400 },
      );
    }

    const response = await fetch(`${getBackendUrl()}/auth/profile/avatar`, {
      method: "POST",
      headers: authHeader,
      body: formData,
      cache: "no-store",
    });
    const data = await readJson(response);

    if (!response.ok) {
      return backendError(response, data, "Failed to upload avatar");
    }

    return NextResponse.json(toProfileResponse(data), { status: response.status });
  } catch {
    return serverNotReadyResponse();
  }
}

export async function DELETE() {
  try {
    const authHeader = await getAuthHeader();

    if (!authHeader) {
      return unauthorizedResponse();
    }

    const response = await fetch(`${getBackendUrl()}/auth/profile/avatar`, {
      method: "DELETE",
      headers: authHeader,
      cache: "no-store",
    });
    const data = await readJson(response);

    if (!response.ok) {
      return backendError(response, data, "Failed to delete avatar");
    }

    return NextResponse.json(toProfileResponse(data), { status: response.status });
  } catch {
    return serverNotReadyResponse();
  }
}
