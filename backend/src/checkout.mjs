export const merchants = [
  { id: "store-a", name: "Mosaic Demo Store A" },
  { id: "store-b", name: "Mosaic Demo Store B" },
];

export const demoCart = {
  id: "cart-demo-1",
  currency: "usd",
  items: [
    {
      productId: "lamp-a",
      merchantId: "store-a",
      name: "Ceramic Demo Lamp",
      unitAmount: 100,
      quantity: 1,
    },
    {
      productId: "vase-b",
      merchantId: "store-b",
      name: "Terracotta Demo Vase",
      unitAmount: 200,
      quantity: 1,
    },
  ],
};

export function groupCartByMerchant(cart) {
  const groups = new Map();
  for (const item of cart.items) {
    if (!Number.isSafeInteger(item.unitAmount) || item.unitAmount < 0) {
      throw new Error(`Invalid price for ${item.productId}`);
    }
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) {
      throw new Error(`Invalid quantity for ${item.productId}`);
    }
    const group = groups.get(item.merchantId) ?? [];
    group.push(item);
    groups.set(item.merchantId, group);
  }
  return [...groups].map(([merchantId, items]) => ({
    merchantId,
    items,
    amount: items.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0),
  }));
}
