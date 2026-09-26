import test from "node:test";
import assert from "node:assert/strict";
import { createStripePaymentStores } from "../src/stripe-payments.mjs";
import { createLinkCheckout } from "../src/link-checkout.mjs";

const keys = { "store-a": "sk_test_store_a", "store-b": "sk_test_store_b" };

function fixtureRequest({ sameAccount = false, methodType = "link" } = {}) {
  const calls = [];
  const request = async (key, path, options = {}) => {
    calls.push({ key, path, options });
    const isA = key === keys["store-a"];
    const merchantId = isA ? "store-a" : "store-b";
    const amount = isA ? 100 : 200;
    if (path === "account") return { id: isA || sameAccount ? "acct_store_a" : "acct_store_b" };
    if (path === "checkout/sessions") {
      const p = options.params;
      return { id: `cs_test_${merchantId}`, livemode: false, amount_total: amount, currency: "usd",
        client_reference_id: p.get("client_reference_id"),
        metadata: { mosaic_merchant_id: merchantId },
        url: `https://checkout.stripe.com/c/pay/cs_test_${merchantId}` };
    }
    if (path.startsWith("checkout/sessions/")) return {
      id: `cs_test_${merchantId}`, livemode: false, amount_total: amount, currency: "usd",
      client_reference_id: "checkout-test", metadata: { mosaic_checkout_id: "checkout-test", mosaic_merchant_id: merchantId },
      status: "complete", payment_status: "paid", payment_intent: `pi_${merchantId}`,
    };
    if (path.startsWith("payment_intents/")) return {
      id: `pi_${merchantId}`, livemode: false, status: "succeeded", amount_received: amount, currency: "usd",
      metadata: { mosaic_checkout_id: "checkout-test", mosaic_merchant_id: merchantId }, payment_method: `pm_${merchantId}`,
    };
    if (path.startsWith("payment_methods/")) return { id: `pm_${merchantId}`, livemode: false, type: methodType };
    throw new Error(`Unexpected path ${path}`);
  };
  return { request, calls };
}

function approvedAuthorizer() {
  return {
    async requestApproval({ merchantId, amount, currency }) {
      return { id: `lsrq_${merchantId}`, merchantId, amount, currency, status: "approved" };
    },
    async getStatus(request) { return request; },
  };
}

test("two approved cart groups create exact Stripe test checkouts in distinct merchant accounts", async () => {
  const fixture = fixtureRequest();
  const stores = createStripePaymentStores({ keys, request: fixture.request });
  const checkout = createLinkCheckout(approvedAuthorizer(), { paymentStores: stores,
    baseUrl: "http://127.0.0.1:3000", initialSession: {
      id: "checkout-test", cartId: "cart-demo-1", currency: "usd", total: 300,
      requests: [
        { id: "lsrq_store-a", merchantId: "store-a", amount: 100, currency: "usd", status: "approved" },
        { id: "lsrq_store-b", merchantId: "store-b", amount: 200, currency: "usd", status: "approved" },
      ], orders: [], payments: [],
    } });
  const prepared = await checkout.preparePayments();
  assert.deepEqual(prepared.payments.map(({ merchantId, accountId, amount }) => [merchantId, accountId, amount]), [
    ["store-a", "acct_store_a", 100], ["store-b", "acct_store_b", 200],
  ]);
  const creates = fixture.calls.filter(({ path }) => path === "checkout/sessions");
  assert.equal(creates.length, 2);
  assert.deepEqual(creates.map(({ options }) => options.params.get("line_items[0][price_data][unit_amount]")), ["100", "200"]);
  assert.ok(creates.every(({ options }) => options.params.get("payment_method_types[1]") === "link"));
  assert.equal((await checkout.preparePayments()).payments.length, 2);
  assert.equal(fixture.calls.filter(({ path }) => path === "checkout/sessions").length, 2);
  const verified = await checkout.refreshPayments();
  assert.equal(verified.status, "link_test_payments_verified");
  assert.ok(verified.payments.every(({ verified }) => verified));
});

test("one Stripe account cannot masquerade as two merchants", async () => {
  const fixture = fixtureRequest({ sameAccount: true });
  const stores = createStripePaymentStores({ keys, request: fixture.request });
  await assert.rejects(stores.verifyDistinctAccounts(), /distinct Stripe accounts/);
  assert.equal(fixture.calls.filter(({ path }) => path === "checkout/sessions").length, 0);
});

test("a paid card checkout is not verified as a Link payment", async () => {
  const fixture = fixtureRequest({ methodType: "card" });
  const stores = createStripePaymentStores({ keys, request: fixture.request });
  const payment = await stores.createSession({ checkoutId: "checkout-test", cartId: "cart-demo-1",
    merchantId: "store-a", items: [{ name: "Lamp", unitAmount: 100, quantity: 1 }],
    amount: 100, currency: "usd", approvalId: "lsrq_store-a", baseUrl: "http://127.0.0.1:3000" });
  const result = await stores.verifySession(payment, "checkout-test");
  assert.equal(result.paymentStatus, "paid");
  assert.equal(result.verified, false);
  assert.equal(result.paymentMethodType, "card");
});
