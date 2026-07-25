import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const cookiesMock = vi.hoisted(() => vi.fn());
const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

interface CookieStore {
  get(name: string): { value: string } | undefined;
}

function createRequest(query = "") {
  return new NextRequest(
    `http://localhost/api/spending-budget/overview${query ? `?${query}` : ""}`,
  );
}

describe("GET /api/spending-budget/overview", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_BACKEND_URL = "https://backend.example.com/";
    cookiesMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("forwards only supported period filters with the access token", async () => {
    const cookieStore: CookieStore = {
      get: () => ({ value: "access-token" }),
    };
    cookiesMock.mockResolvedValue(cookieStore);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ budgets: [] }), { status: 200 }),
    );

    const response = await GET(
      createRequest(
        "period=weekly&date=2026-07-20&start=2026-07-20&end=2026-07-26&month=2026-07&year=2026&unexpected=discard-me",
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ budgets: [] });
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, options] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe(
      "https://backend.example.com/spending-budget/overview?period=weekly&date=2026-07-20&start=2026-07-20&end=2026-07-26&month=2026-07&year=2026",
    );
    expect(options).toMatchObject({
      headers: { Authorization: "Bearer access-token" },
      cache: "no-store",
    });
  });

  it("returns 401 without calling the backend when no access token exists", async () => {
    const cookieStore: CookieStore = { get: () => undefined };
    cookiesMock.mockResolvedValue(cookieStore);

    const response = await GET(createRequest("period=daily&date=2026-07-20"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: "Unauthorized" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves backend error status and message", async () => {
    const cookieStore: CookieStore = {
      get: () => ({ value: "access-token" }),
    };
    cookiesMock.mockResolvedValue(cookieStore);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ message: "Weekly overview must cover exactly seven consecutive days" }),
        { status: 400 },
      ),
    );

    const response = await GET(
      createRequest("period=weekly&start=2026-07-20&end=2026-07-25"),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      message: "Weekly overview must cover exactly seven consecutive days",
    });
  });
});
