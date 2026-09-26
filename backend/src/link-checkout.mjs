import { randomUUID } from "node:crypto";
import { demoCart, groupCartByMerchant, merchants } from "./checkout.mjs";

const merchantUrls = {
  "store-a": "https://example.com",
  "store-b": "https://example.org",
};

function checkoutStatus(session, groupCount) {
  if (session.payments?.length === groupCount && session.payments.every(({ verified }) => verified)) return "link_test_payments_verified";
  if (session.payments?.some(({ paymentStatus, verified }) => paymentStatus === "paid" && !verified)) return "non_link_payment_detected";
  if (session.payments?.length) return "awaiting_link_test_payments";
  if (session.orders.length === groupCount && session.orders.every(({ status }) => status === "test_order_created")) {
    return "test_orders_created";
  }
  if (session.orders.length > 0) return "partial_test_orders";
  if (session.requests.length < groupCount) return "creating_approvals";
  if (session.requests.some(({ status }) => ["declined", "canceled", "cancelled", "expired"].includes(status))) return "approval_failed";
  if (session.requests.every(({ status }) => status === "approved")) return "approved_for_test_checkout";
  return "awaiting_approval";
}

export function createLinkCheckout(authorizer, { testStores, paymentStores, baseUrl, initialSession = null, onChange = async () => {} } = {}) {
  const groups = groupCartByMerchant(demoCart);
  let session = initialSession ? { ...initialSession, orders: initialSession.orders ?? [], payments: initialSession.payments ?? [] } : null;
  let startPromise = null;
  let completePromise = null;
  let preparePromise = null;

  async function save() {
    await onChange(current());
  }

  async function start() {
    if (startPromise) return startPromise;
    if (!session) {
      session = {
        id: `checkout-${randomUUID()}`,
        cartId: demoCart.id,
        currency: demoCart.currency,
        total: groups.reduce((sum, group) => sum + group.amount, 0),
        requests: [],
        orders: [],
        payments: [],
      };
      await save();
    }
    startPromise = (async () => {
      for (const group of groups) {
        if (session.requests.some(({ merchantId }) => merchantId === group.merchantId)) continue;
        const merchant = merchants.find(({ id }) => id === group.merchantId);
        if (!merchant) throw new Error(`Unknown merchant ${group.merchantId}`);
        const request = await authorizer.requestApproval({
          checkoutId: session.id,
          merchantId: merchant.id,
          merchantName: merchant.name,
          merchantUrl: merchantUrls[merchant.id],
          amount: group.amount,
          currency: demoCart.currency,
          items: group.items,
        });
        session.requests.push(request);
        await save();
      }
      return current();
    })();
    try {
      return await startPromise;
    } finally {
      startPromise = null;
    }
  }

  function current() {
    if (!session) return null;
    return {
      ...session,
      status: checkoutStatus(session, groups.length),
      requests: session.requests.map((request) => ({ ...request })),
      orders: session.orders.map((order) => ({ ...order })),
      payments: (session.payments ?? []).map((payment) => ({ ...payment })),
    };
  }

  async function refresh() {
    if (!session) return null;
    session.requests = await Promise.all(session.requests.map((request) => authorizer.getStatus(request)));
    await save();
    return current();
  }

  async function complete() {
    if (!session) throw new Error("Checkout not started");
    if (!testStores) throw new Error("Test stores are unavailable");
    if (completePromise) return completePromise;
    completePromise = (async () => {
      await refresh();
      if (!groups.every(({ merchantId, amount }) =>
        session.requests.some((request) =>
          request.merchantId === merchantId &&
          request.amount === amount &&
          request.currency === demoCart.currency &&
          request.status === "approved"
        ))) {
        const error = new Error("Both merchant approvals must be current and match the cart");
        error.code = "APPROVAL_REQUIRED";
        throw error;
      }

      for (const group of groups) {
        if (session.orders.some((order) => order.merchantId === group.merchantId && order.status === "test_order_created")) continue;
        const approval = session.requests.find((request) => request.merchantId === group.merchantId);
        let order;
        try {
          order = await testStores[group.merchantId].placeOrder({
            checkoutId: session.id,
            cartId: session.cartId,
            ...group,
            currency: session.currency,
            approvalId: approval.id,
          });
        } catch (error) {
          order = {
            merchantId: group.merchantId,
            amount: group.amount,
            currency: session.currency,
            status: "test_order_failed",
            error: error.message,
          };
        }
        session.orders = session.orders.filter((existing) => existing.merchantId !== group.merchantId);
        session.orders.push(order);
        await save();
      }
      return current();
    })();
    try {
      return await completePromise;
    } finally {
      completePromise = null;
    }
  }

  async function preparePayments() {
    if (!session) throw new Error("Checkout not started");
    if (!paymentStores) throw new Error("Stripe test stores are unavailable");
    if (preparePromise) return preparePromise;
    preparePromise = (async () => {
      await refresh();
      if (!groups.every(({ merchantId, amount }) =>
        session.requests.some((request) => request.merchantId === merchantId &&
          request.amount === amount && request.currency === session.currency && request.status === "approved"))) {
        const error = new Error("Both merchant approvals must be current and match the cart");
        error.code = "APPROVAL_REQUIRED";
        throw error;
      }
      await paymentStores.verifyDistinctAccounts();
      for (const group of groups) {
        if (session.payments.some((payment) => payment.merchantId === group.merchantId)) continue;
        const approval = session.requests.find((request) => request.merchantId === group.merchantId);
        const payment = await paymentStores.createSession({
          checkoutId: session.id, cartId: session.cartId, ...group,
          currency: session.currency, approvalId: approval.id, baseUrl,
        });
        session.payments.push(payment);
        await save();
      }
      return current();
    })();
    try { return await preparePromise; } finally { preparePromise = null; }
  }

  async function refreshPayments() {
    if (!session) return null;
    if (!paymentStores) throw new Error("Stripe test stores are unavailable");
    session.payments = await Promise.all(session.payments.map((payment) => paymentStores.verifySession(payment, session.id)));
    await save();
    return current();
  }

  return { start, current, refresh, complete, preparePayments, refreshPayments };
}
