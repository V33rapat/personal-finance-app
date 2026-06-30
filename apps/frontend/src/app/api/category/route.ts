import { NextRequest, NextResponse } from "next/server";
import {
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  unauthorizedResponse,
} from "../_lib/bff";

type CategoryType = "income" | "expense";

interface CategoryRequestBody {
  name?: string;
  type?: CategoryType;
  color?: string | null;
  icon?: string | null;
}

function buildCategoryUrl(request: NextRequest) {
  const url = new URL(`${getBackendUrl()}/category`);
  const type = request.nextUrl.searchParams.get("type");
  const search = request.nextUrl.searchParams.get("search");

  if (type === "income" || type === "expense") {
    url.searchParams.set("type", type);
  }

  if (search) {
    url.searchParams.set("search", search);
  }

  return url;
}

function toBackendCategoryBody(body: CategoryRequestBody) {
  return {
    name: body.name?.trim(),
    type: body.type,
    color: body.color || undefined,
    icon: body.icon || undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = await getAuthHeader();

    if (!authHeader) {
      return unauthorizedResponse();
    }

    const res = await fetch(buildCategoryUrl(request), {
      headers: authHeader,
      cache: "no-store",
    });

    const data = await readJson(res);

    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message ?? "Failed to load categories" },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: res.status });
  } catch {
    return serverNotReadyResponse();
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = await getAuthHeader();

    if (!authHeader) {
      return unauthorizedResponse();
    }

    const body = (await request.json()) as CategoryRequestBody;

    const res = await fetch(`${getBackendUrl()}/category`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify(toBackendCategoryBody(body)),
      cache: "no-store",
    });

    const data = await readJson(res);

    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message ?? "Failed to create category" },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: res.status });
  } catch {
    return serverNotReadyResponse();
  }
}
