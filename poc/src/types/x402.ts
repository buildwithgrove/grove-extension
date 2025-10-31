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
  result: {
    tip_id: string;
    status: string;
    chain: string;
    tipper_tx_hash: string;
    settlement_tx_hash: string;
    to: string;
    from: string;
    amount_sent: string;
    amount_received: string;
    fee_amount: string;
    denomination: string;
  };
}

export interface SettledPaymentHeader {
  success: boolean;
  transaction?: string;
  error_reason?: string;
}
