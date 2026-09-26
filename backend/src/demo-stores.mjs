import { demoCart, groupCartByMerchant, merchants } from "./checkout.mjs";

const catalog = new Map(groupCartByMerchant(demoCart).map((group) => [group.merchantId, group]));

export function createTestStores() {
  const receipts = new Map();

  return Object.fromEntries(
    merchants.map(({ id }) => [
      id,
      {
        async placeOrder({ checkoutId, cartId, merchantId, items, amount, currency, approvalId }) {
          if (merchantId !== id || cartId !== demoCart.id || currency !== demoCart.currency) {
            throw new Error(`Invalid ${id} checkout identity`);
          }
          const expected = catalog.get(id);
          if (
            amount !== expected.amount ||
            JSON.stringify(items) !== JSON.stringify(expected.items) ||
            typeof approvalId !== "string" ||
            !approvalId.startsWith("lsrq_")
          ) {
            throw new Error(`Invalid ${id} checkout amount or approval`);
          }

          const key = `${checkoutId}:${id}`;
          if (receipts.has(key)) return receipts.get(key);
          const receipt = {
            id: `${id}-test-order-${checkoutId}`,
            merchantId: id,
            cartId,
            amount,
            currency,
            approvalId,
            status: "test_order_created",
            paymentStatus: "not_charged",
            items,
          };
          receipts.set(key, receipt);
          return receipt;
        },
      },
    ]),
  );
}
