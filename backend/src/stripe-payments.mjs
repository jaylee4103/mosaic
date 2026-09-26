import { merchants } from "./checkout.mjs";

function testKey(value, merchantId) {
  if (!value?.startsWith("sk_test_")) throw new Error(`A Stripe test secret key is required for ${merchantId}`);
  return value;
}

export function createStripeApi(fetchImpl = fetch) {
  return async function stripeRequest(key, path, { params, idempotencyKey } = {}) {
    const url = new URL(`https://api.stripe.com/v1/${path}`);
    const headers = { Authorization: `Bearer ${key}` };
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
    const options = { headers };
    if (params) {
      options.method = "POST";
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      options.body = params.toString();
    }
    const response = await fetchImpl(url, options);
    const body = await response.json();
    if (!response.ok) throw new Error(`Stripe ${response.status}: ${body.error?.message ?? "request failed"}`);
    return body;
  };
}

export function createStripePaymentStores({ keys = {
  "store-a": process.env.STRIPE_STORE_A_TEST_SECRET_KEY,
  "store-b": process.env.STRIPE_STORE_B_TEST_SECRET_KEY,
}, request = createStripeApi() } = {}) {
  const accounts = new Map();
  async function accountFor(merchantId) {
    const key = testKey(keys[merchantId], merchantId);
    if (!accounts.has(merchantId)) {
      const account = await request(key, "account");
      if (!account.id?.startsWith("acct_")) throw new Error(`Stripe account unavailable for ${merchantId}`);
      accounts.set(merchantId, account.id);
    }
    return { key, accountId: accounts.get(merchantId) };
  }

  return {
    async verifyDistinctAccounts() {
      const ids = await Promise.all(merchants.map(({ id }) => accountFor(id).then(({ accountId }) => accountId)));
      if (new Set(ids).size !== ids.length) throw new Error("Store A and Store B must use distinct Stripe accounts");
    },
    async createSession({ checkoutId, cartId, merchantId, items, amount, currency, approvalId, baseUrl }) {
      const { key, accountId } = await accountFor(merchantId);
      const params = new URLSearchParams({
        mode: "payment",
        client_reference_id: checkoutId,
        success_url: `${baseUrl}/api/demo/checkout/return?merchant=${merchantId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/api/demo/checkout/return?merchant=${merchantId}&canceled=1`,
        "metadata[mosaic_checkout_id]": checkoutId,
        "metadata[mosaic_cart_id]": cartId,
        "metadata[mosaic_merchant_id]": merchantId,
        "metadata[link_approval_id]": approvalId,
        "payment_intent_data[metadata][mosaic_checkout_id]": checkoutId,
        "payment_intent_data[metadata][mosaic_merchant_id]": merchantId,
        "payment_method_types[0]": "card",
        "payment_method_types[1]": "link",
      });
      items.forEach((item, index) => {
        params.set(`line_items[${index}][price_data][currency]`, currency);
        params.set(`line_items[${index}][price_data][unit_amount]`, String(item.unitAmount));
        params.set(`line_items[${index}][price_data][product_data][name]`, item.name);
        params.set(`line_items[${index}][quantity]`, String(item.quantity));
      });
      const session = await request(key, "checkout/sessions", {
        params,
        idempotencyKey: `mosaic:${checkoutId}:${merchantId}:checkout`,
      });
      if (session.livemode !== false || !session.id?.startsWith("cs_test_") ||
          session.amount_total !== amount || session.currency !== currency ||
          session.client_reference_id !== checkoutId || session.metadata?.mosaic_merchant_id !== merchantId ||
          !session.url?.startsWith("https://checkout.stripe.com/")) {
        throw new Error(`Stripe test Checkout Session does not match ${merchantId}`);
      }
      return { id: session.id, merchantId, accountId, amount, currency, url: session.url,
        status: "awaiting_customer", paymentStatus: "unpaid", approvalId };
    },
    async verifySession(payment, checkoutId) {
      const { key, accountId } = await accountFor(payment.merchantId);
      if (accountId !== payment.accountId) throw new Error(`Stripe account changed for ${payment.merchantId}`);
      const session = await request(key, `checkout/sessions/${encodeURIComponent(payment.id)}`);
      if (session.livemode !== false || session.id !== payment.id ||
          session.amount_total !== payment.amount || session.currency !== payment.currency ||
          session.client_reference_id !== checkoutId || session.metadata?.mosaic_checkout_id !== checkoutId ||
          session.metadata?.mosaic_merchant_id !== payment.merchantId) {
        throw new Error(`Stripe Checkout Session does not match ${payment.merchantId}`);
      }
      if (session.status !== "complete" || session.payment_status !== "paid" || !session.payment_intent) {
        return { ...payment, status: session.status, paymentStatus: session.payment_status, verified: false };
      }
      const intentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id;
      const intent = await request(key, `payment_intents/${encodeURIComponent(intentId)}`);
      const methodId = typeof intent.payment_method === "string" ? intent.payment_method : intent.payment_method?.id;
      if (intent.livemode !== false || intent.status !== "succeeded" ||
          intent.amount_received !== payment.amount || intent.currency !== payment.currency || !methodId ||
          intent.metadata?.mosaic_checkout_id !== checkoutId || intent.metadata?.mosaic_merchant_id !== payment.merchantId) {
        throw new Error(`Stripe PaymentIntent does not match ${payment.merchantId}`);
      }
      const method = await request(key, `payment_methods/${encodeURIComponent(methodId)}`);
      return { ...payment, status: "complete", paymentStatus: "paid", paymentIntentId: intent.id,
        paymentMethodType: method.type, verified: method.type === "link" && method.livemode === false };
    },
  };
}
