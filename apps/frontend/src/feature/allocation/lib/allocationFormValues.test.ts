import { describe, expect, it, vi } from "vitest";
import { getAllocationDuplicateValues, getAllocationFormValues } from "./allocationFormValues";
import type { MoneyAllocation } from "../hooks/useAllocation";
import { getTodayDateString } from "./allocationDate";

const allocation: MoneyAllocation = {
  id: "allocation-1",
  source_wallet_id: "wallet-source",
  source_wallet_name: "เงินเดือน",
  amount: "300.00",
  allocation_date: "2026-07-20",
  note: "แบ่งเงินเก็บ",
  created_at: "2026-07-20T02:00:00.000Z",
  updated_at: "2026-07-20T02:00:00.000Z",
  destinations: [
    {
      transfer_id: "transfer-1",
      wallet_id: "wallet-saving",
      wallet_name: "เงินสำรอง",
      amount: "200.00",
    },
    {
      transfer_id: "transfer-2",
      wallet_id: "wallet-travel",
      wallet_name: "เที่ยว",
      amount: "100.00",
    },
  ],
};

describe("allocation form value helpers", () => {
  it("maps an existing allocation into editable fields without movement ids", () => {
    expect(getAllocationFormValues(allocation)).toEqual({
      source_wallet_id: "wallet-source",
      amount: "300.00",
      allocation_date: "2026-07-20",
      note: "แบ่งเงินเก็บ",
      destinations: [
        { wallet_id: "wallet-saving", amount: "200.00" },
        { wallet_id: "wallet-travel", amount: "100.00" },
      ],
    });
  });

  it("copies allocation details but uses the supplied current date", () => {
    const duplicate = getAllocationDuplicateValues(allocation, "2026-10-12");

    expect(duplicate).toEqual({
      source_wallet_id: "wallet-source",
      amount: "300.00",
      allocation_date: "2026-10-12",
      note: "แบ่งเงินเก็บ",
      destinations: [
        { wallet_id: "wallet-saving", amount: "200.00" },
        { wallet_id: "wallet-travel", amount: "100.00" },
      ],
    });
    expect(JSON.stringify(duplicate)).not.toContain("transfer-1");
    expect(JSON.stringify(duplicate)).not.toContain("allocation-1");
  });

  it("uses the Bangkok calendar date when determining today", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-10-11T18:00:00.000Z"));
      expect(getTodayDateString()).toBe("2026-10-12");
    } finally {
      vi.useRealTimers();
    }
  });
});
