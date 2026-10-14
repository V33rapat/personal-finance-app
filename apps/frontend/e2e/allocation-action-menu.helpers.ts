import type { Page } from "@playwright/test";

interface E2EWallet {
  id: string;
  name: string;
  parent_wallet_id: string | null;
  is_active: boolean;
  deleted_at: string | null;
}

export interface AllocationActionFixture {
  marker: string;
  originalNote: string;
  editedNote: string;
  duplicateNote: string;
  sourceWalletId: string;
  destinationWalletIds: [string, string];
  allocationDate: string;
}

function getApiUrl(page: Page, path: string) {
  return new URL(path, page.url()).toString();
}

async function fetchJsonFromPage(page: Page, path: string, method = "GET", body?: unknown) {
  return page.evaluate(
    async ({ url, requestMethod, requestBody }) => {
      const response = await fetch(url, {
        method: requestMethod,
        headers: requestBody ? { "Content-Type": "application/json" } : undefined,
        body: requestBody ? JSON.stringify(requestBody) : undefined,
      });

      return {
        ok: response.ok,
        status: response.status,
        data: await response.json().catch(() => null),
      };
    },
    { url: getApiUrl(page, path), requestMethod: method, requestBody: body },
  );
}

export function getBangkokDateOffset(offsetDays: number) {
  const dateParts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const dateValues = Object.fromEntries(dateParts.map(({ type, value }) => [type, value]));
  const date = new Date(
    Date.UTC(
      Number(dateValues.year),
      Number(dateValues.month) - 1,
      Number(dateValues.day) + offsetDays,
    ),
  );

  return date.toISOString().slice(0, 10);
}

export async function createAllocationActionFixture(page: Page, marker: string) {
  const walletsResponse = await fetchJsonFromPage(page, "/api/wallet");
  if (!walletsResponse.ok) {
    throw new Error(`Could not load allocation test wallets: ${JSON.stringify(walletsResponse.data)}`);
  }

  const wallets = walletsResponse.data as E2EWallet[];
  const source = wallets.find((wallet) => wallet.name === "E2E เงินสด");
  const firstDestination = wallets.find(
    (wallet) => wallet.name === "E2E Wallet Summary Extra One",
  );
  const secondDestination = wallets.find(
    (wallet) => wallet.name === "E2E Wallet Summary Extra Two",
  );

  if (!source || !firstDestination || !secondDestination) {
    throw new Error("Allocation E2E wallets are missing from the User A fixture");
  }

  const allocationDate = getBangkokDateOffset(-3);
  const fixture: AllocationActionFixture = {
    marker,
    originalNote: `${marker} original`,
    editedNote: `${marker} edited`,
    duplicateNote: `${marker} copy`,
    sourceWalletId: source.id,
    destinationWalletIds: [firstDestination.id, secondDestination.id],
    allocationDate,
  };
  const response = await fetchJsonFromPage(page, "/api/allocation", "POST", {
      source_wallet_id: fixture.sourceWalletId,
      amount: 10,
      allocation_date: fixture.allocationDate,
      note: fixture.originalNote,
      destinations: fixture.destinationWalletIds.map((wallet_id) => ({
        wallet_id,
        amount: 5,
      })),
  });

  if (!response.ok) {
    throw new Error(`Could not create allocation test fixture: ${JSON.stringify(response.data)}`);
  }

  return fixture;
}

export async function cleanupAllocationActionFixtures(page: Page, marker: string) {
  const response = await fetchJsonFromPage(page, "/api/allocation");
  if (!response.ok) return;

  const allocations = response.data as Array<{ id: string; note: string | null }>;
  const fixtureAllocations = allocations.filter((allocation) =>
    allocation.note?.startsWith(marker),
  );

  await page.evaluate(async (items) => {
    await Promise.all(
      items.map((allocation) => fetch(`/api/allocation/${allocation.id}`, { method: "DELETE" })),
    );
  }, fixtureAllocations);
}
