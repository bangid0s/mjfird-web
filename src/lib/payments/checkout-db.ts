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
  orderId: string | null;
  captureId: string | null;
  capturePending: boolean;
  disposition: "open" | "uncertain" | "held" | "matched";
  expectedMerchant: string | null;
  amount: string;
  currency: "USD";
  capturedAt: string | null;
};

export type CheckoutFailure =
  | "not_payable"
  | "amount_mismatch"
  | "missing_price"
  | "request_not_found"
  | "invalid_order"
  | "order_not_found"
  | "capture_mismatch"
  | "invalid_capture";

export type ReserveResult = { ok: true; orderId: string | null } | { ok: false; reason: CheckoutFailure };

export type AttachResult = { ok: true; orderId: string } | { ok: false; reason: CheckoutFailure };

export type BeginCaptureResult =
  | { ok: true; state: "ready" | "pending" | "done" }
  | { ok: false; reason: "not_payable" | "order_not_found" };

export type CaptureSettlement =
  | { ok: true; result: "completed" | "duplicate" | "held" }
  | { ok: false; reason: CheckoutFailure };

export type CheckoutDb = {
  getRequest(id: string): Promise<RequestRecord | null>;
  getCheckoutByRequest(requestId: string): Promise<CheckoutRecord | null>;
  getCheckoutByOrder(orderId: string): Promise<CheckoutRecord | null>;
  reserveOrder(input: { requestId: string; amount: string; currency: "USD" }): Promise<ReserveResult>;
  attachOrder(input: { requestId: string; orderId: string; amount: string; currency: "USD" }): Promise<AttachResult>;
  beginCapture(orderId: string): Promise<BeginCaptureResult>;
  releaseCapture(orderId: string): Promise<void>;
  holdCapture(input: { orderId: string; captureId: string | null; evidence: string; kind: "uncertain" | "held" }): Promise<void>;
  noteExpectedMerchant(orderId: string, merchantId: string): Promise<void>;
  proveMerchant(orderId: string, merchantId: string): Promise<"proven" | "rejected" | "unconfigured">;
  completeCapture(input: { orderId: string; captureId: string; amount: string; currency: string }): Promise<CaptureSettlement>;
};

export class CheckoutDbError extends Error {
  constructor() {
    super("database");
    this.name = "CheckoutDbError";
  }
}
