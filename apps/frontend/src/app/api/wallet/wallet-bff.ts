export {
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  unauthorizedResponse,
} from "../_lib/bff";

export interface WalletRequestBody {
  name?: string;
  parentWalletId?: string | null;
  parent_wallet_id?: string | null;
  walletType?: "normal" | "investment";
  wallet_type?: "normal" | "investment";
  description?: string | null;
  color?: string | null;
  icon?: string | null;
}

export function toBackendWalletBody(body: WalletRequestBody) {
  return {
    name: body.name,
    parentWalletId:
      body.parentWalletId !== undefined
        ? body.parentWalletId
        : body.parent_wallet_id,
    walletType:
      body.walletType !== undefined ? body.walletType : body.wallet_type,
    description: body.description,
    color: body.color,
    icon: body.icon,
  };
}
