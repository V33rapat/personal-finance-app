export {
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  unauthorizedResponse,
} from "../_lib/bff";

interface AllocationDestinationRequestBody {
  walletId?: string | null;
  wallet_id?: string | null;
  amount?: number | string | null;
}

export interface AllocationRequestBody {
  sourceWalletId?: string | null;
  source_wallet_id?: string | null;
  amount?: number | string | null;
  allocationDate?: string | null;
  allocation_date?: string | null;
  note?: string | null;
  destinations?: AllocationDestinationRequestBody[];
}

function toBackendAmount(amount: number | string | null | undefined) {
  if (amount === undefined || amount === null) {
    return undefined;
  }

  return typeof amount === "string" ? Number(amount) : amount;
}

function toBackendDestination(destination: AllocationDestinationRequestBody) {
  return {
    wallet_id:
      destination.walletId !== undefined
        ? destination.walletId
        : destination.wallet_id,
    amount: toBackendAmount(destination.amount),
  };
}

export function toBackendAllocationBody(body: AllocationRequestBody) {
  return {
    source_wallet_id:
      body.sourceWalletId !== undefined
        ? body.sourceWalletId
        : body.source_wallet_id,
    amount: toBackendAmount(body.amount),
    allocation_date:
      body.allocationDate !== undefined
        ? body.allocationDate
        : body.allocation_date,
    note: body.note,
    destinations: Array.isArray(body.destinations)
      ? body.destinations.map(toBackendDestination)
      : undefined,
  };
}
