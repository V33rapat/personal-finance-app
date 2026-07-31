import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH } from "./route";

const cookiesMock = vi.hoisted(() => vi.fn());
const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

interface CookieStore {
  get(name: string): { value: string } | undefined;
}

function createPatchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/dashboard/wallet-summary", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/dashboard/wallet-summary", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_BACKEND_URL = "https://backend.example.com/";
    cookiesMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("forwards GET with the access token", async () => {
    const cookieStore: CookieStore = {
      get: () => ({ value: "access-token" }),
    };
    cookiesMock.mockResolvedValue(cookieStore);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ displayed_wallets: [] }), { status: 200 }),
    );

    const response = await GET();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.example.com/dashboard/wallet-summary",
      {
        headers: { Authorization: "Bearer access-token" },
        cache: "no-store",
      },
    );
  });

  it("forwards only wallet_ids for PATCH", async () => {
    const cookieStore: CookieStore = {
      get: () => ({ value: "access-token" }),
    };
    cookiesMock.mockResolvedValue(cookieStore);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ is_configured: true }), { status: 200 }),
    );

    const response = await PATCH(
      createPatchRequest({
        wallet_ids: ["wallet-a"],
        is_configured: false,
        unexpected: "must-not-reach-backend",
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.example.com/dashboard/wallet-summary",
      {
        method: "PATCH",
        headers: {
          Authorization: "Bearer access-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ wallet_ids: ["wallet-a"] }),
        cache: "no-store",
      },
    );
  });

  it("returns 401 without calling the backend when no access token exists", async () => {
    const cookieStore: CookieStore = { get: () => undefined };
    cookiesMock.mockResolvedValue(cookieStore);

    const response = await PATCH(createPatchRequest({ wallet_ids: [] }));

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
        JSON.stringify({ message: "Selected wallets must be available to the user" }),
        { status: 400 },
      ),
    );

    const response = await PATCH(createPatchRequest({ wallet_ids: ["wallet-a"] }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      message: "Selected wallets must be available to the user",
    });
  });
});
