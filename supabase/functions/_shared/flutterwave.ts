// Shared Flutterwave (v3) helpers: hosted-checkout creation, transaction
// verification, and webhook verif-hash checking. Used by
// create-flutterwave-order-payment, create-flutterwave-course-payment,
// verify-and-pay-order, purchase-course, and flutterwave-webhook.
//
// Docs: https://developer.flutterwave.com/docs/flutterwave-standard-1 and
// https://developer.flutterwave.com/docs/webhooks. Test vs live mode is
// decided purely by which secret key is set (FLWSECK_TEST-... vs
// FLWSECK-...) -- the base URL is the same for both.

const FLW_SECRET_KEY = Deno.env.get("FLW_SECRET_KEY")!;
// Not an API key -- an arbitrary string we choose and also paste into the
// Flutterwave dashboard (Settings > Webhooks > Secret hash). Flutterwave
// echoes it back in every webhook's `verif-hash` header.
const FLW_SECRET_HASH = Deno.env.get("FLW_SECRET_HASH") ?? "";
const FLW_BASE_URL = "https://api.flutterwave.com/v3";

export interface CreateCheckoutParams {
  reference: string;
  amountNaira: number;
  redirectUrl: string;
  title: string;
  description: string;
  customerEmail: string;
  customerName?: string;
}

// POST /v3/payments -- Flutterwave Standard. Returns a hosted checkout
// link to redirect the buyer's browser to. There's no separate cancel URL:
// Flutterwave sends the buyer back to redirectUrl either way, with
// ?status=successful|cancelled&tx_ref=...&transaction_id=... appended.
// The webhook URL isn't per-request either; it's set once in the
// Flutterwave dashboard.
export async function createFlutterwaveCheckout(params: CreateCheckoutParams): Promise<{ link: string }> {
  if (!params.customerEmail) {
    throw new Error("An email address is required to pay. Please add one to your account.");
  }

  const response = await fetch(`${FLW_BASE_URL}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FLW_SECRET_KEY}`,
    },
    body: JSON.stringify({
      tx_ref: params.reference,
      amount: params.amountNaira,
      currency: "NGN",
      redirect_url: params.redirectUrl,
      customer: { email: params.customerEmail, name: params.customerName },
      customizations: { title: params.title, description: params.description },
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || data?.status !== "success" || !data?.data?.link) {
    throw new Error(data?.message || "Failed to initialize Flutterwave checkout.");
  }
  return { link: data.data.link };
}

export interface VerifyResult {
  success: boolean;
  status?: string;
  amount?: number; // naira
  message?: string;
}

// GET /v3/transactions/verify_by_reference -- the server-to-Flutterwave
// check. Never trust the redirect's ?status=successful or a webhook body on
// their own; this is the source of truth for whether money actually moved.
export async function verifyFlutterwaveTransaction(reference: string): Promise<VerifyResult> {
  const response = await fetch(
    `${FLW_BASE_URL}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` } },
  );

  const data = await response.json().catch(() => null);
  if (!response.ok || data?.status !== "success" || !data?.data) {
    return { success: false, message: data?.message || "Transaction verification failed on Flutterwave." };
  }
  const tx = data.data;
  if (tx.status !== "successful") {
    return { success: false, status: tx.status, message: `Payment status: ${tx.status}` };
  }
  if (tx.currency !== "NGN") {
    return { success: false, status: tx.status, message: `Unexpected payment currency: ${tx.currency}` };
  }
  return { success: true, status: tx.status, amount: Number(tx.amount) };
}

// Constant-time comparison of the webhook's `verif-hash` header against
// FLW_SECRET_HASH. Fails closed if the secret hash was never configured.
export function verifyFlutterwaveWebhook(receivedHash: string | null): boolean {
  if (!FLW_SECRET_HASH || !receivedHash) return false;
  const a = new TextEncoder().encode(FLW_SECRET_HASH);
  const b = new TextEncoder().encode(receivedHash);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
