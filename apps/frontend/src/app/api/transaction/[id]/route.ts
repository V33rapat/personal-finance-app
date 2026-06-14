import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

function getBackendUrl() {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }
}

async function getAuthHeader() {
  const token = (await cookies()).get("accessToken")?.value;

  if (!token) {
    return null;
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, context: RouteContext) {
  const authHeader = await getAuthHeader();

  if (!authHeader) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const res = await fetch(`${getBackendUrl()}/transaction/${id}`, {
    headers: authHeader,
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ message: data.message }, { status: res.status });
  }

  return NextResponse.json(data, { status: res.status });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authHeader = await getAuthHeader();

  if (!authHeader) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();

  const res = await fetch(`${getBackendUrl()}/transaction/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ message: data.message }, { status: res.status });
  }

  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  const authHeader = await getAuthHeader();

  if (!authHeader) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const res = await fetch(`${getBackendUrl()}/transaction/${id}`, {
    method: "DELETE",
    headers: authHeader,
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ message: data.message }, { status: res.status });
  }

  return NextResponse.json(data, { status: res.status });
}