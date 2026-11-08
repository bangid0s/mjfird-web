export type RequestRecord = {
  id: string;
  clientId: string;
  status: string;
  finalPrice: unknown;
  currency: string;
  ref: number;
  paidAt: string | null;
};

export type CheckoutRecord = {
  requestId: string;
  orderId: string;
  captureId: string | null;
  amount: string;
  currency: "USD";
  capturedAt: string | null;
};

export type BindResult =
  | { ok: true; orderId: string }
  | { ok: false; reason: "not_payable" | "amount_mismatch" | "missing_price" | "request_not_found" | "invalid_order" };

export type CaptureSettlement =
  | { ok: true; result: "completed" | "duplicate" }
  | {
      ok: false;
      reason: "order_not_found" | "capture_mismatch" | "not_payable" | "amount_mismatch" | "invalid_capture";
    };

export type CheckoutDb = {
  getRequest(id: string): Promise<RequestRecord | null>;
  getCheckoutByRequest(requestId: string): Promise<CheckoutRecord | null>;
  getCheckoutByOrder(orderId: string): Promise<CheckoutRecord | null>;
  bindOrder(input: { requestId: string; orderId: string; amount: string; currency: "USD" }): Promise<BindResult>;
  completeCapture(input: { orderId: string; captureId: string; amount: string; currency: string }): Promise<CaptureSettlement>;
};

export class CheckoutDbError extends Error {
  constructor() {
    super("database");
    this.name = "CheckoutDbError";
  }
}
