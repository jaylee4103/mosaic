import { createServer } from "node:http";
import { demoCart, merchants } from "./checkout.mjs";
import { createLinkAuthorizer } from "./link.mjs";
import { createLinkCheckout } from "./link-checkout.mjs";
import { createTestStores } from "./demo-stores.mjs";
import { createStripePaymentStores } from "./stripe-payments.mjs";
import { loadDemoSession, saveDemoSession } from "./session-store.mjs";

const linkCheckout = createLinkCheckout(createLinkAuthorizer(), {
  testStores: createTestStores(),
  paymentStores: createStripePaymentStores(),
  baseUrl: `http://127.0.0.1:${Number(process.env.PORT ?? 3000)}`,
  initialSession: await loadDemoSession(),
  onChange: saveDemoSession,
});

const server = createServer(async (request, response) => {
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");

  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200).end(JSON.stringify({ ok: true, mode: "test-only" }));
    return;
  }

  if (request.method === "GET" && request.url === "/api/demo/cart") {
    const total = demoCart.items.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0);
    response.writeHead(200).end(JSON.stringify({ ...demoCart, merchants, total }));
    return;
  }

  if (request.method === "POST" && request.url === "/api/demo/checkout") {
    try {
      const result = await linkCheckout.start();
      response.writeHead(202).end(JSON.stringify(result));
    } catch (error) {
      response.writeHead(502).end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  if (request.method === "GET" && request.url === "/api/demo/checkout") {
    try {
      const result = await linkCheckout.refresh();
      if (!result) response.writeHead(404).end(JSON.stringify({ error: "Checkout not started" }));
      else response.writeHead(200).end(JSON.stringify(result));
    } catch (error) {
      response.writeHead(502).end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  if (request.method === "POST" && request.url === "/api/demo/checkout/complete") {
    try {
      const result = await linkCheckout.complete();
      response.writeHead(200).end(JSON.stringify(result));
    } catch (error) {
      const status = error.code === "APPROVAL_REQUIRED" ? 409 : 502;
      response.writeHead(status).end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  if (request.method === "POST" && request.url === "/api/demo/checkout/payments") {
    try {
      const result = await linkCheckout.preparePayments();
      response.writeHead(200).end(JSON.stringify(result));
    } catch (error) {
      response.writeHead(error.code === "APPROVAL_REQUIRED" ? 409 : 502).end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  if (request.method === "GET" && request.url === "/api/demo/checkout/payments") {
    try {
      const result = await linkCheckout.refreshPayments();
      response.writeHead(result ? 200 : 404).end(JSON.stringify(result ?? { error: "Checkout not started" }));
    } catch (error) {
      response.writeHead(502).end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  if (request.method === "GET" && request.url?.startsWith("/api/demo/checkout/return?")) {
    try {
      const result = await linkCheckout.refreshPayments();
      response.writeHead(result ? 200 : 404).end(JSON.stringify(result ? {
        checkoutId: result.id,
        status: result.status,
        payments: result.payments.map(({ merchantId, amount, currency, paymentStatus, paymentMethodType, verified }) => ({
          merchantId, amount, currency, paymentStatus, paymentMethodType, verified,
        })),
      } : { error: "Checkout not started" }));
    } catch (error) {
      response.writeHead(502).end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  response.writeHead(404).end(JSON.stringify({ error: "Not found" }));
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, "127.0.0.1", () => {
  console.log(`Mosaic checkout test server listening at http://127.0.0.1:${port}`);
});
