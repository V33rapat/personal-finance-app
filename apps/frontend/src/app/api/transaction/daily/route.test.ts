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
    `http://localhost/api/transaction/daily${query ? `?${query}` : ""}`,
  );
}

describe("GET /api/transaction/daily", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_BACKEND_URL = "https://backend.example.com/";
    cookiesMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("forwards only supported daily transaction filters", async () => {
    const cookieStore: CookieStore = {
      get: () => ({ value: "access-token" }),
    };
    cookiesMock.mockResolvedValue(cookieStore);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), { status: 200 }),
    );

    const response = await GET(
      createRequest(
        "walletId=wallet-1&date=2026-07-30&type=expense&categoryId=category-1&search=coffee&page=2&unexpected=discard-me",
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items: [] });

    const [url, options] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe(
      "https://backend.example.com/transaction/daily?walletId=wallet-1&date=2026-07-30&type=expense&categoryId=category-1&search=coffee&page=2",
    );
    expect(options).toMatchObject({
      headers: { Authorization: "Bearer access-token" },
      cache: "no-store",
    });
  });

  it("returns 401 without calling the backend when no access token exists", async () => {
    const cookieStore: CookieStore = { get: () => undefined };
    cookiesMock.mockResolvedValue(cookieStore);

    const response = await GET(createRequest("walletId=wallet-1&date=2026-07-30"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: "Unauthorized" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves a backend error status and message", async () => {
    const cookieStore: CookieStore = {
      get: () => ({ value: "access-token" }),
    };
    cookiesMock.mockResolvedValue(cookieStore);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ message: "Transaction date cannot be in the future" }),
        { status: 400 },
      ),
    );

    const response = await GET(
      createRequest("walletId=wallet-1&date=2099-01-01"),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      message: "Transaction date cannot be in the future",
    });
  });
});
