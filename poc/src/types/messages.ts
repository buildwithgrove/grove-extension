import { AccountRecord, ExtensionSettings } from ".";
import { TipResult } from "./index";

export interface RuntimeAccountPayload {
  id: string;
  chainId: AccountRecord["chainId"];
  address: string;
  privateKey: string;
}

export type RuntimeMessage =
  | { type: "PING" }
  | { type: "GET_ACTIVE_DOMAIN" }
  | {
      type: "RUN_TIP";
      payload: {
        account: RuntimeAccountPayload;
        amountUsd: number;
        memo?: string;
        apiBaseUrl: string;
        domain?: string;
      };
    }
  | {
      type: "SETTINGS_UPDATED";
      payload: ExtensionSettings;
    };

export type RuntimeResponse =
  | { type: "ACK" }
  | { type: "ACTIVE_DOMAIN"; domain?: string }
  | { type: "TIP_RESULT"; result: TipResult }
  | { type: "ERROR"; message: string };
