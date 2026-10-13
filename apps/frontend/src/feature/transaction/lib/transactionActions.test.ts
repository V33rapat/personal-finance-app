import { describe, expect, it } from "vitest";
import type { Transaction } from "../components/TransactionItem";
import type { TransactionFormValues } from "../hooks/useTransaction";
import {
  getDuplicateTransactionValues,
  getTransactionActionIds,
  toTransactionCreatePayload,
  toTransactionUpdatePayload,
} from "./transactionActions";

const transaction: Transaction = {
  id: "transaction-1",
  wallet_id: "wallet-1",
  category_id: "category-1",
  template_id: "template-1",
  name: "  ค่าอาหาร  ",
  type: "expense",
  amount: "60.50",
  note: "  มื้อเที่ยง  ",
  transaction_date: "2026-07-20",
  created_at: "2026-07-20T05:00:00.000Z",
};

const formValues: TransactionFormValues = {
  wallet_id: transaction.wallet_id,
  name: transaction.name,
  amount: transaction.amount,
  type: transaction.type,
  category_id: transaction.category_id,
  template_id: transaction.template_id,
  transaction_date: transaction.transaction_date,
  note: transaction.note ?? "",
};

describe("transaction action helpers", () => {
  it("exposes all actions only for manual transactions", () => {
    expect(getTransactionActionIds({ management: undefined })).toEqual([
      "edit",
      "duplicate",
      "template",
      "delete",
    ]);
    expect(getTransactionActionIds({ management: "manual" })).toHaveLength(4);
    expect(getTransactionActionIds({ management: "transfer" })).toEqual([]);
    expect(getTransactionActionIds({ management: "allocation" })).toEqual([]);
  });

  it("copies editable fields and clears the original template", () => {
    expect(getDuplicateTransactionValues(formValues)).toEqual({
      ...formValues,
      name: "  ค่าอาหาร   (สำเนา)",
      template_id: null,
    });
  });

  it("creates a safe POST payload without transaction metadata", () => {
    const payload = toTransactionCreatePayload(formValues);

    expect(payload).toEqual({
      wallet_id: "wallet-1",
      name: "ค่าอาหาร",
      amount: 60.5,
      type: "expense",
      category_id: "category-1",
      template_id: "template-1",
      transaction_date: "2026-07-20",
      note: "มื้อเที่ยง",
    });
    expect(payload).not.toHaveProperty("id");
    expect(payload).not.toHaveProperty("created_at");
    expect(payload).not.toHaveProperty("management");
  });

  it("keeps template metadata out of the PATCH payload", () => {
    expect(toTransactionUpdatePayload(formValues)).toEqual({
      wallet_id: "wallet-1",
      name: "ค่าอาหาร",
      amount: 60.5,
      type: "expense",
      category_id: "category-1",
      transaction_date: "2026-07-20",
      note: "มื้อเที่ยง",
    });
  });
});
