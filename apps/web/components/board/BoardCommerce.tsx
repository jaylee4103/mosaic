"use client";

import { useEffect, useState } from "react";
import {
  applyCartActions, getCart, getCheckout, getCheckoutProofs, preparePayments, refreshPayments,
  runMerchantCheckout, setCartBudget, shopWithAgent, startCheckout, updateCartItem,
  type Cart, type Checkout, type CheckoutProof,
} from "@/lib/boards/store";

type CartItem = Cart["items"][number];
type Message = { id: number; role: "shopper" | "mosaic"; text: string; products?: CartItem[] };

function money(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

function ProductThumb({ item, size = 48 }: { item: CartItem; size?: number }) {
  const style = { width: size, height: size };
  if (item.product?.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary merchant-hosted URLs, not part of the Next.js image pipeline
    return <img src={item.product.imageUrl} alt={item.product.name} style={style} className="shrink-0 rounded-lg border border-stone-200 object-cover" />;
  }
  return <div style={style} className="shrink-0 rounded-lg border border-stone-200 bg-stone-100" aria-hidden="true" />;
}

export function BoardCommerce({ boardId, vibeName }: { boardId: string; vibeName: string | null }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [paymentLinks, setPaymentLinks] = useState<Checkout | null>(null);
  const [browserProofs, setBrowserProofs] = useState<Record<string, CheckoutProof>>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [budgetInput, setBudgetInput] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const returnedFromStripe = new URLSearchParams(window.location.search).has("merchant");
        const latestCheckout = returnedFromStripe ? await refreshPayments(boardId) : await getCheckout(boardId);
        const latestCart = await getCart(boardId);
        const proofs = await getCheckoutProofs(boardId);
        if (!active) return;
        setCheckout(latestCheckout);
        setCart(latestCart);
        setBrowserProofs(Object.fromEntries(proofs.map((proof) => [proof.productId, proof])));
        setBudgetInput(latestCart.budgetCents === null ? "" : String(latestCart.budgetCents / 100));
        if (returnedFromStripe) {
          window.history.replaceState(window.history.state, "", window.location.pathname);
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load shopping state");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [boardId]);

  function report(cause: unknown, fallback: string) {
    setError(cause instanceof Error ? cause.message : fallback);
  }

  async function sendToAgent(message: string, displayText = message) {
    if (!message.trim() || busy || cart?.status !== "open") return;
    const priorItemIds = new Set(cart?.items.map((item) => item.id) ?? []);
    setMessages((current) => [...current, { id: Date.now(), role: "shopper", text: displayText }]);
    setBusy("shop");
    setError(null);
    try {
      const result = await shopWithAgent(boardId, message);
      setCart(result.cart);
      setBudgetInput(result.cart.budgetCents === null ? "" : String(result.cart.budgetCents / 100));
      setQuery((current) => current.trim() === message ? "" : current);
      // Cart items the agent touched this turn (added, replaced, or swapped
      // in) — their cart_item id is new even though the productId slot may
      // be reused, so this catches add/replace/swap alike. Surfaced as a
      // product card alongside the reply so the picked item's image and
      // price are visible right in the chat, not just in the cart aside.
      const touchedItems = result.cart.items.filter((item) => !priorItemIds.has(item.id));
      setMessages((current) => [...current, {
        id: Date.now() + 1, role: "mosaic",
        text: result.assistantMessage.trim() || "I reviewed your request. Check the cart for any changes.",
        products: touchedItems.length > 0 ? touchedItems : undefined,
      }]);
    } catch (cause) {
      report(cause, "Could not shop for products");
    } finally {
      setBusy(null);
    }
  }

  async function submitMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendToAgent(query.trim());
  }

  async function changeItem(item: Cart["items"][number], action: "lock" | "remove" | "decrease" | "increase") {
    if (!cart || busy || cart.status !== "open") return;
    setBusy(item.id);
    setError(null);
    try {
      if (action === "lock" || action === "remove") {
        const result = await applyCartActions(boardId, [{ type: action === "remove" ? "REMOVE" : item.locked ? "UNLOCK" : "LOCK", productId: item.productId }]);
        setCart(result.cart);
        const failure = result.results.find((entry) => !entry.ok);
        if (failure) throw new Error(failure.error ?? "Could not update item");
      } else {
        const quantity = item.quantity + (action === "increase" ? 1 : -1);
        if (quantity < 1 || quantity > 99) return;
        setCart(await updateCartItem(boardId, item.id, { quantity }));
      }
    } catch (cause) {
      report(cause, "Could not update item");
    } finally {
      setBusy(null);
    }
  }

  async function saveBudget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cart || busy || cart.status !== "open") return;
    const enteredBudget = budgetInput.trim();
    const amount = enteredBudget === "" ? null : Number(enteredBudget);
    if (amount !== null && !/^\d+(?:\.\d{1,2})?$/.test(enteredBudget)) {
      setError("Enter a valid dollar budget with at most two decimal places.");
      return;
    }
    setBusy("budget");
    setError(null);
    try {
      setCart(await setCartBudget(boardId, amount === null ? null : Math.round(amount * 100)));
    } catch (cause) {
      report(cause, "Could not save budget");
    } finally {
      setBusy(null);
    }
  }

  async function beginCheckout() {
    if (!cart || busy || cart.items.length === 0 || cart.status !== "open") return;
    if (cart.remainingCents !== null && cart.remainingCents < 0) {
      setError("This cart is over budget. Update the budget or cart before checkout.");
      return;
    }
    setBusy("checkout");
    setError(null);
    try {
      // Two disjoint checkout paths per item's merchant (see
      // .spec/browser-checkout-proof.md): 'browser' merchants have no API
      // integration, so the agent drives their real site instead and stops
      // with a screenshot right before payment. Everything else goes
      // through the existing Stripe test-checkout flow.
      const browserItems = cart.items.filter((item) => item.product?.checkoutMethod === "browser");
      const hasOtherItems = cart.items.some((item) => item.product && item.product.checkoutMethod !== "browser");

      const [proofResults] = await Promise.all([
        Promise.all(browserItems.map((item) => runMerchantCheckout(boardId, item.productId).catch((cause) => {
          report(cause, `Could not run checkout for ${item.product?.name ?? "an item"}`);
          return null;
        }))),
        hasOtherItems ? startCheckout(boardId).then(setCheckout) : Promise.resolve(),
      ]);

      const newProofs = proofResults.filter((proof): proof is CheckoutProof => proof !== null);
      if (newProofs.length > 0) {
        setBrowserProofs((current) => ({ ...current, ...Object.fromEntries(newProofs.map((proof) => [proof.productId, proof])) }));
      }
      setCart(await getCart(boardId));
    } catch (cause) {
      report(cause, "Could not start checkout");
    } finally {
      setBusy(null);
    }
  }

  async function loadPaymentLinks() {
    if (busy) return;
    setBusy("payments");
    setError(null);
    try {
      const prepared = await preparePayments(boardId);
      setCheckout(prepared);
      setPaymentLinks(prepared);
    } catch (cause) {
      report(cause, "Could not prepare test payments");
    } finally {
      setBusy(null);
    }
  }

  async function checkPaymentStatus() {
    if (busy) return;
    setBusy("refresh");
    setError(null);
    try {
      setCheckout(await refreshPayments(boardId));
      setCart(await getCart(boardId));
      setPaymentLinks(null);
    } catch (cause) {
      report(cause, "Could not verify payments");
    } finally {
      setBusy(null);
    }
  }

  const activeCheckout = checkout && (checkout.status !== "completed" || checkout.cartId === cart?.id || cart?.items.length === 0);
  const merchantOrders = checkout?.merchantOrders ?? [];

  return (
    <div className="mt-8 grid gap-6 border-t border-stone-200 pt-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
      <section aria-label="Shopping conversation" className="min-w-0">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-fraunces)] text-2xl text-stone-900">Shop this vibe</h2>
            <p className="mt-1 text-sm text-stone-500">{vibeName ? `Inspired by ${vibeName}. ` : ""}Tell Mosaic what you want, and it will add its pick to your cart.</p>
          </div>
        </div>
        <div aria-live="polite" className="mt-4 min-h-32 space-y-3 rounded-2xl border border-stone-200 bg-white/70 p-4">
          {messages.length === 0 && <p className="text-sm text-stone-500">Try “a warm ceramic lamp under $100” or “linen for my room”.</p>}
          {messages.map((message) => (
            <div key={message.id} className={`max-w-[90%] space-y-2 rounded-2xl px-4 py-2 text-sm ${message.role === "shopper" ? "ml-auto bg-stone-900 text-white" : "bg-[#efe4d2] text-stone-800"}`}>
              <p>{message.text}</p>
              {message.products?.map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-xl bg-white/60 p-2">
                  <ProductThumb item={item} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-stone-900">{item.product?.name ?? "Unavailable product"}</p>
                    <p className="text-xs text-stone-600">{item.product ? money(item.product.priceCents, item.product.currency) : null}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <form onSubmit={(event) => void submitMessage(event)} className="mt-3 flex gap-2">
          <label htmlFor="shopping-message" className="sr-only">Shopping request</label>
          <input id="shopping-message" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="What would you like to find?" className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-stone-500" />
          <button type="submit" disabled={loading || Boolean(busy) || !query.trim() || cart?.status !== "open"} className="rounded-xl bg-stone-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-40">{busy === "shop" ? "Shopping…" : "Send"}</button>
        </form>
        <p className="mt-2 text-xs text-stone-500">Mosaic chooses from the demo catalog. You can still adjust or remove items in your cart.</p>
      </section>

      <aside aria-label="Cart and checkout" className="min-w-0 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl text-stone-900">Your cart</h2>
        {loading && <p className="mt-3 text-sm text-stone-500">Loading cart…</p>}
        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {cart && <>
          <div className="mt-4 space-y-4">
            {cart.items.length === 0 && <p className="text-sm text-stone-500">No items yet. Ask Mosaic what you want to shop for.</p>}
            {cart.items.map((item) => <div key={item.id} className="border-b border-stone-100 pb-4 text-sm">
              <div className="flex gap-3">
                <ProductThumb item={item} size={56} />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-3"><p className="truncate font-medium text-stone-900">{item.product?.name ?? "Unavailable product"}</p><p className="whitespace-nowrap">{money(item.subtotalCents, cart.currency)}</p></div>
                  <p className="mt-1 text-xs text-stone-500">{item.product?.merchantName ?? "Merchant unavailable"}</p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <button type="button" aria-label={`Decrease ${item.product?.name ?? "item"} quantity`} disabled={Boolean(busy) || item.locked || item.quantity <= 1 || cart.status !== "open"} onClick={() => void changeItem(item, "decrease")} className="rounded border px-2 py-1 disabled:opacity-40">−</button>
                <span>{item.quantity}</span>
                <button type="button" aria-label={`Increase ${item.product?.name ?? "item"} quantity`} disabled={Boolean(busy) || item.locked || item.quantity >= 99 || cart.status !== "open"} onClick={() => void changeItem(item, "increase")} className="rounded border px-2 py-1 disabled:opacity-40">+</button>
                <button type="button" disabled={Boolean(busy) || cart.status !== "open"} onClick={() => void changeItem(item, "lock")} className="ml-1 underline disabled:opacity-40">{item.locked ? "Unlock" : "Lock"}</button>
                <button type="button" disabled={Boolean(busy) || item.locked || cart.status !== "open"} onClick={() => void sendToAgent(`Replace the cart item with productId ${item.productId} with a similar product that fits this board's vibe and budget.`, `Find another option for ${item.product?.name ?? "this item"}.`)} className="underline disabled:opacity-40">Replace</button>
                <button type="button" disabled={Boolean(busy) || item.locked || cart.status !== "open"} onClick={() => void changeItem(item, "remove")} className="underline disabled:opacity-40">Remove</button>
              </div>
              {browserProofs[item.productId] && (() => {
                const proof = browserProofs[item.productId];
                return <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
                  <p className="text-xs font-medium text-stone-900">
                    {proof.success ? "Reached checkout — stopped before payment" : `Checkout attempt: ${proof.stoppedReason.replaceAll("_", " ")}`}
                  </p>
                  {proof.screenshotUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL, not a static asset
                    <img src={proof.screenshotUrl} alt={`Checkout page reached for ${item.product?.name ?? "this item"}`} className="mt-2 w-full rounded-md border border-stone-200" />
                  )}
                  <a href={proof.finalUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-stone-900 underline">
                    Open this checkout page to enter your info →
                  </a>
                </div>;
              })()}
            </div>)}
          </div>
          <form onSubmit={(event) => void saveBudget(event)} className="mt-3 flex items-end gap-2">
            <label className="flex-1 text-xs text-stone-600">Budget ($)<input inputMode="decimal" value={budgetInput} onChange={(event) => setBudgetInput(event.target.value)} disabled={cart.status !== "open"} placeholder="Optional" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" /></label>
            <button type="submit" disabled={Boolean(busy) || cart.status !== "open"} className="rounded-lg border border-stone-300 px-3 py-2 text-sm disabled:opacity-40">Save</button>
          </form>
          <div className="mt-4 flex justify-between border-t border-stone-200 pt-4 font-semibold"><span>Total</span><span>{money(cart.totalCents, cart.currency)}</span></div>
          {cart.budgetCents !== null && <p className={`mt-2 text-sm ${cart.remainingCents !== null && cart.remainingCents < 0 ? "text-red-700" : "text-stone-600"}`}>{cart.remainingCents !== null && cart.remainingCents < 0 ? `${money(-cart.remainingCents)} over budget` : `${money(cart.remainingCents ?? 0)} remaining`}</p>}
        </>}

        {cart && cart.status === "open" && cart.items.length > 0 && <div className="mt-6 rounded-xl bg-[#f8f1e7] p-4">
          <h3 className="font-medium text-stone-900">Review checkout</h3>
          <p className="mt-1 text-xs text-stone-600">Demo-catalog items use Stripe test mode — you approve a separate hosted payment per merchant. Internet-sourced items instead get walked to their real checkout page and stopped right before payment, with a screenshot as proof. No real money moves either way.</p>
          <button type="button" disabled={Boolean(busy)} onClick={() => void beginCheckout()} className="mt-3 w-full rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">{busy === "checkout" ? "Starting…" : "Start checkout"}</button>
        </div>}

        {activeCheckout && checkout && <div className="mt-6 border-t border-stone-200 pt-5">
          <h3 className="font-medium text-stone-900">Merchant payments</h3>
          <p className="mt-1 text-xs text-stone-600">{checkout.status === "completed" ? "All test payments verified." : `Checkout total: ${money(checkout.totalCents, checkout.currency)}. Complete each store separately.`}</p>
          <div className="mt-3 space-y-3">
            {merchantOrders.map((order) => {
              const link = paymentLinks?.merchantOrders.find((entry) => entry.merchantId === order.merchantId)?.checkoutUrl;
              const safeLink = link?.startsWith("https://checkout.stripe.com/") ? link : null;
              return <div key={order.id} className="rounded-lg border border-stone-200 p-3 text-sm">
                <div className="flex justify-between gap-3"><span className="font-medium">{order.merchantName}</span><span>{money(order.amountCents, checkout.currency)}</span></div>
                <p className="mt-1 text-xs text-stone-500">{order.paymentStatus === "paid" ? `Paid${order.linkVerified ? " with Link" : ""}` : order.paymentStatus === "failed" ? "Needs retry" : "Awaiting payment"}</p>
                {order.errorMessage && <p className="mt-1 text-xs text-red-700">{order.errorMessage}</p>}
                {order.paymentStatus !== "paid" && safeLink && <a href={safeLink} className="mt-2 inline-block text-xs font-semibold text-stone-900 underline">Pay {money(order.amountCents, checkout.currency)} at {order.merchantName}</a>}
              </div>;
            })}
          </div>
          {checkout.status !== "completed" && <button type="button" disabled={Boolean(busy)} onClick={() => void loadPaymentLinks()} className="mt-3 w-full rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">{busy === "payments" ? "Preparing…" : "Get payment links"}</button>}
          <button type="button" disabled={Boolean(busy)} onClick={() => void checkPaymentStatus()} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm disabled:opacity-40">{busy === "refresh" ? "Checking…" : "Refresh payment status"}</button>
        </div>}
      </aside>
    </div>
  );
}
