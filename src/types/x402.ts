export interface PaymentRequirementsDto {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType?: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra?: {
    name?: string;
    version?: string;
    [key: string]: unknown;
  };
}

export interface PaymentRequiredResponseDto {
  x402Version: number;
  accepts: PaymentRequirementsDto[];
  error?: string;
}

export interface TipResponseDto {
  tip_id: string;
  status: string;
  chain: string;
  tx_hash: string;
  to: string;
  from: string;
}

export interface SettledPaymentHeader {
  success: boolean;
  transaction?: string;
  error_reason?: string;
}
