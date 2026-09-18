// Shared OPay Cashier API (Nigeria) helpers: request signing, checkout
// creation, payment-status query, and webhook-callback signature
// verification. Used by create-opay-order-payment, create-opay-course-payment,
// verify-and-pay-order, purchase-course, and opay-webhook.
//
// Docs: https://documentation.opaycheckout.com -- this is the Nigeria
// documentation set. The sibling doc.opaycheckout.com domain (no
// "documentation" prefix) covers Egypt instead and uses different request
// fields/signing -- don't mix the two up.

const OPAY_SECRET_KEY = Deno.env.get("OPAY_SECRET_KEY")!;
const OPAY_PUBLIC_KEY = Deno.env.get("OPAY_PUBLIC_KEY")!;
const OPAY_MERCHANT_ID = Deno.env.get("OPAY_MERCHANT_ID")!;
// Sandbox by default; set OPAY_BASE_URL=https://liveapi.opaycheckout.com
// (as an Edge Function secret) to go live.
const OPAY_BASE_URL = Deno.env.get("OPAY_BASE_URL") || "https://testapi.opaycheckout.com";

// Web Crypto has no SHA3 variant, and OPay's callback signature (the
// "sha512" field) is actually HMAC-SHA3-512 despite the name -- pull in a
// small, audited implementation for that one case.
import { hmac } from "npm:@noble/hashes@1.5.0/hmac";
import { sha3_512 } from "npm:@noble/hashes@1.5.0/sha3";

// OPay requires the JSON payload's keys sorted alphabetically (recursively,
// for nested objects) before it's stringified and HMAC'd -- both for
// request signing (query-status, refund, etc) and would apply to any
// future nested-object signing here.
function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

async function hmacSha512Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hmacSha3_512Hex(secret: string, message: string): string {
  const sig = hmac(sha3_512, new TextEncoder().encode(secret), new TextEncoder().encode(message));
  return Array.from(sig).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface CreateCheckoutParams {
  reference: string;
  amountKobo: number;
  returnUrl: string;
  cancelUrl: string;
  callbackUrl: string;
  productName: string;
  productDescription: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
}

export interface CreateCheckoutResult {
  reference: string;
  orderNo: string;
  cashierUrl: string;
  status: string;
}

// POST /api/v1/international/cashier/create -- the only OPay call
// authenticated with the plain public key (Bearer {publicKey}) rather than
// a computed signature. Returns a hosted checkout URL to redirect the
// buyer's browser to (OPay's checkout is redirect-based, not an inline
// widget like Paystack's).
export async function createOpayCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
  const body = {
    country: "NG",
    reference: params.reference,
    amount: { total: params.amountKobo, currency: "NGN" },
    returnUrl: params.returnUrl,
    cancelUrl: params.cancelUrl,
    callbackUrl: params.callbackUrl,
    product: { name: params.productName, description: params.productDescription },
    userInfo: {
      userId: params.userId,
      userEmail: params.userEmail,
      userName: params.userName,
    },
  };

  const response = await fetch(`${OPAY_BASE_URL}/api/v1/international/cashier/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPAY_PUBLIC_KEY}`,
      MerchantId: OPAY_MERCHANT_ID,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || data?.code !== "00000" || !data?.data?.cashierUrl) {
    throw new Error(data?.message || "Failed to initialize OPay checkout.");
  }
  return data.data as CreateCheckoutResult;
}

export interface QueryStatusResult {
  success: boolean;
  status?: string;
  amount?: number; // naira (converted back from kobo)
  message?: string;
}

// POST /api/v1/international/cashier/status -- authenticated with a
// computed HMAC-SHA512 signature (Bearer {signature}) of the
// alphabetically-sorted request body, per
// https://documentation.opaycheckout.com/api-signature. Never trusts the
// client's say-so that a payment succeeded; this is the server-to-OPay
// check, same role Paystack's /transaction/verify played before.
export async function queryOpayStatus(reference: string): Promise<QueryStatusResult> {
  const sortedBody = sortKeysDeep({ reference, country: "NG" });
  const payload = JSON.stringify(sortedBody);
  const signature = await hmacSha512Hex(OPAY_SECRET_KEY, payload);

  const response = await fetch(`${OPAY_BASE_URL}/api/v1/international/cashier/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${signature}`,
      MerchantId: OPAY_MERCHANT_ID,
    },
    body: payload,
  });

  if (!response.ok) {
    return { success: false, message: "OPay API responded with an error status." };
  }
  const data = await response.json().catch(() => null);
  if (data?.code !== "00000" || !data?.data) {
    return { success: false, message: data?.message || "Transaction verification failed on OPay." };
  }
  if (data.data.status !== "SUCCESS") {
    return {
      success: false,
      status: data.data.status,
      message: data.data.failureReason || `Payment status: ${data.data.status}`,
    };
  }
  return { success: true, status: "SUCCESS", amount: Number(data.data.amount?.total ?? 0) / 100 };
}

export interface OpayCallbackPayload {
  amount: string;
  currency: string;
  reference: string;
  refunded: boolean;
  status: string;
  timestamp: string;
  token: string;
  transactionId: string;
}

// Verifies an incoming webhook's `sha512` field. Despite the name this is
// HMAC-SHA3-512 (not SHA-512) over a fixed format string built from these
// exact payload fields in this exact order -- not the raw JSON body. See
// https://documentation.opaycheckout.com/callback-signature.
export function verifyOpayCallbackSignature(payload: OpayCallbackPayload, receivedSha512: string): boolean {
  const signContent = `{Amount:"${payload.amount}",Currency:"${payload.currency}",Reference:"${payload.reference}",Refunded:${
    payload.refunded ? "t" : "f"
  },Status:"${payload.status}",Timestamp:"${payload.timestamp}",Token:"${payload.token}",TransactionID:"${payload.transactionId}"}`;
  const expected = hmacSha3_512Hex(OPAY_SECRET_KEY, signContent);
  return expected.toLowerCase() === receivedSha512.toLowerCase();
}
