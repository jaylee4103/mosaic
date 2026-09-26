import test from "node:test";
import assert from "node:assert/strict";
import { demoCart, groupCartByMerchant } from "../src/checkout.mjs";
import { createTestStores } from "../src/demo-stores.mjs";

test("one cart groups into exact integer-cent totals for two stores", () => {
  const groups = groupCartByMerchant(demoCart);
  assert.deepEqual(groups.map(({ merchantId, amount }) => [merchantId, amount]), [
    ["store-a", 100],
    ["store-b", 200],
  ]);
});

test("test stores reject a checkout whose amount differs from the approved cart", async () => {
  const stores = createTestStores();
  const group = groupCartByMerchant(demoCart)[0];
  await assert.rejects(
    stores["store-a"].placeOrder({
      checkoutId: "checkout-1",
      cartId: demoCart.id,
      ...group,
      amount: 101,
      currency: "usd",
      approvalId: "lsrq_approved_a",
    }),
    /Invalid store-a checkout amount or approval/,
  );
});
