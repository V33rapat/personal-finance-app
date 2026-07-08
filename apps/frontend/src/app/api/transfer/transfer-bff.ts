export {
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  unauthorizedResponse,
} from "../_lib/bff";

export interface TransferRequestBody {
  fromWalletId?: string | null;
  from_wallet_id?: string | null;
  toWalletId?: string | null;
  to_wallet_id?: string | null;
  amount?: number | string | null;
  transferDate?: string | null;
  transfer_date?: string | null;
  note?: string | null;
}

function toBackendAmount(amount: TransferRequestBody["amount"]) {
  if (amount === undefined || amount === null) {
    return undefined;
  }

  return typeof amount === "string" ? Number(amount) : amount;
}

export function toBackendTransferBody(body: TransferRequestBody) {
  return {
    from_wallet_id:
      body.fromWalletId !== undefined ? body.fromWalletId : body.from_wallet_id,
    to_wallet_id:
      body.toWalletId !== undefined ? body.toWalletId : body.to_wallet_id,
    amount: toBackendAmount(body.amount),
    transfer_date:
      body.transferDate !== undefined ? body.transferDate : body.transfer_date,
    note: body.note,
  };
}
