import { NextRequest, NextResponse } from "next/server";
import {
  AllocationRequestBody,
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  toBackendAllocationBody,
  unauthorizedResponse,
} from "../allocation-bff";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const authHeader = await getAuthHeader();

    if (!authHeader) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const response = await fetch(`${getBackendUrl()}/allocation/${id}`, {
      headers: authHeader,
      cache: "no-store",
    });
    const data = await readJson(response);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message ?? "Failed to load money allocation" },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return serverNotReadyResponse();
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const authHeader = await getAuthHeader();

    if (!authHeader) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const body = (await request.json()) as AllocationRequestBody;
    const response = await fetch(`${getBackendUrl()}/allocation/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify(toBackendAllocationBody(body)),
      cache: "no-store",
    });
    const data = await readJson(response);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message ?? "Failed to update money allocation" },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return serverNotReadyResponse();
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const authHeader = await getAuthHeader();

    if (!authHeader) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const response = await fetch(`${getBackendUrl()}/allocation/${id}`, {
      method: "DELETE",
      headers: authHeader,
      cache: "no-store",
    });
    const data = await readJson(response);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message ?? "Failed to delete money allocation" },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return serverNotReadyResponse();
  }
}
