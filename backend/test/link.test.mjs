import test from "node:test";
import assert from "node:assert/strict";
import { createLinkAuthorizer } from "../src/link.mjs";
import { createLinkCheckout } from "../src/link-checkout.mjs";
import { createTestStores } from "../src/demo-stores.mjs";

test("Link requests are test only, merchant specific, and never ask for card data", async () => {
  const calls = [];
  const authorizer = createLinkAuthorizer(async (args) => {
    calls.push(args);
    return {
      id: "lsrq_test_a",
      status: "pending_approval",
      approval_url: "https://app.link.com/activity/approve/lsrq_test_a",
      amount: 100,
      currency: "usd",
    };
  });
  const request = await authorizer.requestApproval({
    checkoutId: "checkout-1",
    merchantId: "store-a",
    merchantName: "Mosaic Demo Store A",
    merchantUrl: "https://example.com",
    amount: 100,
    currency: "usd",
    items: [{ name: "Ceramic Demo Lamp", unitAmount: 100, quantity: 1 }],
  });

  assert.equal(request.status, "pending_approval");
  assert.equal(request.amount, 100);
  assert.ok(calls[0].includes("--test"));
  assert.ok(calls[0].includes("--request-approval"));
  assert.ok(calls[0].includes("--idempotency-key"));
  assert.ok(!calls[0].includes("--include"));
  assert.ok(!calls[0].includes("card"));
});

test("one cart has two Link approvals and reports readiness only after both approve", async () => {
  const created = [];
  const checkout = createLinkCheckout({
    async requestApproval(input) {
      created.push(input);
      return {
        id: `lsrq_${input.merchantId}`,
        merchantId: input.merchantId,
        amount: input.amount,
        currency: input.currency,
        status: "pending_approval",
        approvalUrl: `https://app.link.com/activity/approve/lsrq_${input.merchantId}`,
      };
    },
    async getStatus(request) {
      return { ...request, status: "approved" };
    },
  }, { testStores: createTestStores() });

  const started = await checkout.start();
  assert.equal(started.status, "awaiting_approval");
  assert.equal(started.total, 300);
  assert.deepEqual(created.map(({ merchantId, amount }) => [merchantId, amount]), [
    ["store-a", 100],
    ["store-b", 200],
  ]);
  assert.equal((await checkout.start()).id, started.id);
  assert.equal(created.length, 2);
  assert.equal((await checkout.refresh()).status, "approved_for_test_checkout");
  const completed = await checkout.complete();
  assert.equal(completed.status, "test_orders_created");
  assert.deepEqual(completed.orders.map(({ merchantId, amount, paymentStatus }) => [merchantId, amount, paymentStatus]), [
    ["store-a", 100, "not_charged"],
    ["store-b", 200, "not_charged"],
  ]);
  assert.deepEqual((await checkout.complete()).orders, completed.orders);
});

test("store orders cannot be created while a Link approval is pending", async () => {
  const checkout = createLinkCheckout({
    async requestApproval({ merchantId, amount, currency }) {
      return { id: `lsrq_${merchantId}`, merchantId, amount, currency, status: "pending_approval" };
    },
    async getStatus(request) {
      return request;
    },
  }, { testStores: createTestStores() });
  await checkout.start();
  await assert.rejects(checkout.complete(), /Both merchant approvals must be current/);
  assert.equal(checkout.current().orders.length, 0);
});

test("a failed test store can retry without duplicating the successful store order", async () => {
  const stores = createTestStores();
  const placeStoreBOrder = stores["store-b"].placeOrder;
  let storeBAttempts = 0;
  stores["store-b"].placeOrder = async (input) => {
    storeBAttempts += 1;
    if (storeBAttempts === 1) throw new Error("Temporary store failure");
    return placeStoreBOrder(input);
  };
  const checkout = createLinkCheckout({
    async requestApproval({ merchantId, amount, currency }) {
      return { id: `lsrq_${merchantId}`, merchantId, amount, currency, status: "approved" };
    },
    async getStatus(request) {
      return request;
    },
  }, { testStores: stores });

  await checkout.start();
  const first = await checkout.complete();
  assert.equal(first.status, "partial_test_orders");
  assert.deepEqual(first.orders.map(({ status }) => status), ["test_order_created", "test_order_failed"]);
  const second = await checkout.complete();
  assert.equal(second.status, "test_orders_created");
  assert.equal(second.orders[0].id, first.orders[0].id);
  assert.equal(storeBAttempts, 2);
});
