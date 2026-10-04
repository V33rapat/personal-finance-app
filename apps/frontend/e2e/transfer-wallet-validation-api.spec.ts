import { expect, test, type Page } from "@playwright/test";
import {
  findWallet,
  postTransfer,
  readBalances,
  readTransfers,
  readWallets,
  removeTransfer,
  TRANSFER_TEST_DATE,
  type TransferPayload,
  type TransferWalletFixture,
} from "./transfer-wallet-validation.helpers";

type InvalidWalletKind = "parent" | "inactive";
type InvalidWalletSide = "source" | "destination";

interface InvalidWalletCase {
  label: string;
  wallet: InvalidWalletKind;
  side: InvalidWalletSide;
}

const invalidWalletCases: InvalidWalletCase[] = [
  { label: "Parent as source", wallet: "parent", side: "source" },
  { label: "Parent as destination", wallet: "parent", side: "destination" },
  { label: "inactive source", wallet: "inactive", side: "source" },
  { label: "inactive destination", wallet: "inactive", side: "destination" },
];

function makeScenario(
  wallets: TransferWalletFixture[],
  invalidCase: InvalidWalletCase,
) {
  const source = findWallet(wallets, "E2E Transfer Source");
  const destination = findWallet(wallets, "E2E Transfer Destination");
  const invalidWallet = findWallet(
    wallets,
    invalidCase.wallet === "parent"
      ? "E2E Transfer Parent"
      : "E2E Transfer Inactive",
  );

  return {
    fromWalletId:
      invalidCase.side === "source" ? invalidWallet.id : source.id,
    toWalletId:
      invalidCase.side === "destination" ? invalidWallet.id : destination.id,
  };
}

function makeTransferPayload(
  scenario: ReturnType<typeof makeScenario>,
): TransferPayload {
  return {
    from_wallet_id: scenario.fromWalletId,
    to_wallet_id: scenario.toWalletId,
    amount: 10,
    transfer_date: TRANSFER_TEST_DATE,
    note: "E2E invalid wallet request",
  };
}

async function expectWalletStateUnchanged(
  page: Page,
  walletIds: string[],
  balancesBefore: Map<string, number>,
  transferIdsBefore: string[],
) {
  const balancesAfter = await readBalances(page, walletIds);
  expect([...balancesAfter.entries()]).toEqual([...balancesBefore.entries()]);

  const transfersAfter = await readTransfers(page);
  expect(transfersAfter.map(({ id }) => id).sort()).toEqual(
    [...transferIdsBefore].sort(),
  );
}

function getRelevantWalletIds(wallets: TransferWalletFixture[]) {
  return [
    findWallet(wallets, "E2E Transfer Source").id,
    findWallet(wallets, "E2E Transfer Destination").id,
    findWallet(wallets, "E2E Transfer Parent").id,
    findWallet(wallets, "E2E Transfer Child").id,
    findWallet(wallets, "E2E Transfer Inactive").id,
  ];
}

test.describe("Transfer wallet API validation", () => {
  for (const invalidCase of invalidWalletCases) {
    test(`rejects POST with ${invalidCase.label}`, async ({ page }) => {
      const wallets = await readWallets(page);
      const scenario = makeScenario(wallets, invalidCase);
      const walletIds = getRelevantWalletIds(wallets);
      const balancesBefore = await readBalances(page, walletIds);
      const transferIdsBefore = (await readTransfers(page)).map(
        ({ id }) => id,
      );

      const response = await postTransfer(
        page,
        makeTransferPayload(scenario),
      );
      expect(response.status()).toBe(404);
      await expectWalletStateUnchanged(
        page,
        walletIds,
        balancesBefore,
        transferIdsBefore,
      );
    });

    test(`rejects PATCH with ${invalidCase.label}`, async ({ page }) => {
      const wallets = await readWallets(page);
      const source = findWallet(wallets, "E2E Transfer Source");
      const destination = findWallet(wallets, "E2E Transfer Destination");
      const scenario = makeScenario(wallets, invalidCase);
      const walletIds = getRelevantWalletIds(wallets);
      const createResponse = await postTransfer(page, {
        from_wallet_id: source.id,
        to_wallet_id: destination.id,
        amount: 10,
        transfer_date: TRANSFER_TEST_DATE,
        note: "E2E patch eligibility baseline",
      });
      expect(createResponse.status()).toBe(201);
      const transfer = (await createResponse.json()) as { id: string };

      try {
        const balancesBefore = await readBalances(page, walletIds);
        const transferIdsBefore = (await readTransfers(page)).map(
          ({ id }) => id,
        );
        const response = await page.request.patch(
          `/api/transfer/${transfer.id}`,
          {
            data: {
              from_wallet_id: scenario.fromWalletId,
              to_wallet_id: scenario.toWalletId,
            },
          },
        );
        expect(response.status()).toBe(404);

        await expectWalletStateUnchanged(
          page,
          walletIds,
          balancesBefore,
          transferIdsBefore,
        );
        const unchangedTransfer = (await readTransfers(page)).find(
          ({ id }) => id === transfer.id,
        );
        expect(unchangedTransfer).toBeDefined();
        expect(unchangedTransfer?.from_wallet_id).toBe(source.id);
        expect(unchangedTransfer?.to_wallet_id).toBe(destination.id);
        expect(Number(unchangedTransfer?.amount)).toBe(10);
      } finally {
        await removeTransfer(page, transfer.id);
      }
    });
  }
});
