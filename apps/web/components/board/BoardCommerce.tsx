"use client";

import { useEffect, useState } from "react";
import {
  addCartItem, applyCartActions, getCart, getCheckout, preparePayments, refreshPayments,
  searchProducts, setCartBudget, startCheckout, updateCartItem,
  type Cart, type Checkout, type Product,
} from "@/lib/boards/store";

type Message = { id: number; role: "shopper" | "mosaic"; text: string };

function money(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

function budgetFromMessage(message: string): number | null {
  const match = message.match(/\b(?:under|below|up to|budget(?: of)?|spend(?: up to)?)\s*\$?([\d,]+(?:\.\d{1,2})?)/i);
  if (!match) return null;
  const amount = Number(match[1].replaceAll(",", ""));
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
}

export function BoardCommerce({ boardId, vibeName }: { boardId: string; vibeName: string | null }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [paymentLinks, setPaymentLinks] = useState<Checkout | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[] | null>(null);
  const [budgetInput, setBudgetInput] = useState("");
  const [replacingProductId, setReplacingProductId] = useState<string | null>(null);
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
        if (!active) return;
        setCheckout(latestCheckout);
        setCart(latestCart);
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

  async function submitMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = query.trim();
    if (!text || busy || cart?.status !== "open") return;
    setMessages((current) => [...current, { id: Date.now(), role: "shopper", text }]);
    setQuery("");
    setBusy("search");
    setError(null);
    try {
      const budgetCents = budgetFromMessage(text);
      if (budgetCents !== null) {
        const updated = await setCartBudget(boardId, budgetCents);
        setCart(updated);
        setBudgetInput(String(budgetCents / 100));
      }
      const found = await searchProducts(text, budgetCents ?? undefined);
      setProducts(found);
      setMessages((current) => [...current, {
        id: Date.now() + 1, role: "mosaic",
        text: `${budgetCents !== null ? `Budget set to ${money(budgetCents)}. ` : ""}${found.length ? `I found ${found.length} match${found.length === 1 ? "" : "es"} in the demo catalog. Add items below or refine your request.` : "I couldn't find a catalog match. Try a product type such as lamp, planter, or linen."}`,
      }]);
    } catch (cause) {
      report(cause, "Could not search products");
    } finally {
      setBusy(null);
    }
  }

  async function addOrReplace(product: Product) {
    if (!cart || busy || cart.status !== "open") return;
    setBusy(product.id);
    setError(null);
    try {
      if (replacingProductId) {
        const result = await applyCartActions(boardId, [{ type: "REPLACE", removeProductId: replacingProductId, addProductId: product.id }]);
        setCart(result.cart);
        const failure = result.results.find((item) => !item.ok);
        if (failure) throw new Error(failure.error ?? "Could not replace this item");
        setReplacingProductId(null);
      } else {
        setCart(await addCartItem(boardId, product.id));
      }
    } catch (cause) {
      report(cause, "Could not update cart");
    } finally {
      setBusy(null);
    }
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
      const started = await startCheckout(boardId);
      setCheckout(started);
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
            <p className="mt-1 text-sm text-stone-500">{vibeName ? `Inspired by ${vibeName}. ` : ""}Search the demo catalog using your own words.</p>
          </div>
        </div>
        <div aria-live="polite" className="mt-4 min-h-32 space-y-3 rounded-2xl border border-stone-200 bg-white/70 p-4">
          {messages.length === 0 && <p className="text-sm text-stone-500">Try “a warm ceramic lamp under $100” or “linen for my room”.</p>}
          {messages.map((message) => (
            <p key={message.id} className={`max-w-[90%] rounded-2xl px-4 py-2 text-sm ${message.role === "shopper" ? "ml-auto bg-stone-900 text-white" : "bg-[#efe4d2] text-stone-800"}`}>
              {message.text}
            </p>
          ))}
        </div>
        <form onSubmit={(event) => void submitMessage(event)} className="mt-3 flex gap-2">
          <label htmlFor="shopping-message" className="sr-only">Shopping request</label>
          <input id="shopping-message" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="What would you like to find?" className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-stone-500" />
          <button type="submit" disabled={loading || Boolean(busy) || !query.trim() || cart?.status !== "open"} className="rounded-xl bg-stone-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-40">{busy === "search" ? "Searching…" : "Send"}</button>
        </form>
        <p className="mt-2 text-xs text-stone-500">Catalog search and budget work now. AI interpretation, vibe ranking, and conversational cart edits are still being integrated.</p>

        {replacingProductId && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-stone-700">Choose a replacement below. <button type="button" onClick={() => setReplacingProductId(null)} className="underline">Cancel</button></p>}
        {products && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {products.length === 0 && <p className="text-sm text-stone-500">No matches yet. Try another request.</p>}
            {products.map((product) => {
              const inCart = cart?.items.some((item) => item.productId === product.id);
              return <article key={product.id} className="flex gap-3 rounded-xl border border-stone-200 bg-white p-3">
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.imageUrl} alt="" className="h-20 w-20 rounded-lg object-cover" />
                ) : <div className="h-20 w-20 shrink-0 rounded-lg bg-stone-100" />}
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-stone-900">{product.name}</h3>
                  <p className="mt-1 text-xs text-stone-500">{product.merchantName} · {money(product.priceCents, product.currency)}</p>
                  <button type="button" disabled={Boolean(busy) || Boolean(inCart) || cart?.status !== "open"} onClick={() => void addOrReplace(product)} className="mt-3 text-xs font-semibold text-stone-800 underline disabled:opacity-40">
                    {inCart ? "In cart" : replacingProductId ? "Replace with this" : "Add to cart"}
                  </button>
                </div>
              </article>;
            })}
          </div>
        )}
      </section>

      <aside aria-label="Cart and checkout" className="min-w-0 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl text-stone-900">Your cart</h2>
        {loading && <p className="mt-3 text-sm text-stone-500">Loading cart…</p>}
        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {cart && <>
          <div className="mt-4 space-y-4">
            {cart.items.length === 0 && <p className="text-sm text-stone-500">No items yet. Search and add a product to get started.</p>}
            {cart.items.map((item) => <div key={item.id} className="border-b border-stone-100 pb-4 text-sm">
              <div className="flex justify-between gap-3"><p className="font-medium text-stone-900">{item.product?.name ?? "Unavailable product"}</p><p className="whitespace-nowrap">{money(item.subtotalCents, cart.currency)}</p></div>
              <p className="mt-1 text-xs text-stone-500">{item.product?.merchantName ?? "Merchant unavailable"}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <button type="button" aria-label={`Decrease ${item.product?.name ?? "item"} quantity`} disabled={Boolean(busy) || item.locked || item.quantity <= 1 || cart.status !== "open"} onClick={() => void changeItem(item, "decrease")} className="rounded border px-2 py-1 disabled:opacity-40">−</button>
                <span>{item.quantity}</span>
                <button type="button" aria-label={`Increase ${item.product?.name ?? "item"} quantity`} disabled={Boolean(busy) || item.locked || item.quantity >= 99 || cart.status !== "open"} onClick={() => void changeItem(item, "increase")} className="rounded border px-2 py-1 disabled:opacity-40">+</button>
                <button type="button" disabled={Boolean(busy) || cart.status !== "open"} onClick={() => void changeItem(item, "lock")} className="ml-1 underline disabled:opacity-40">{item.locked ? "Unlock" : "Lock"}</button>
                <button type="button" disabled={Boolean(busy) || item.locked || cart.status !== "open"} onClick={() => { setReplacingProductId(item.productId); setProducts(null); }} className="underline disabled:opacity-40">Replace</button>
                <button type="button" disabled={Boolean(busy) || item.locked || cart.status !== "open"} onClick={() => void changeItem(item, "remove")} className="underline disabled:opacity-40">Remove</button>
              </div>
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
          <p className="mt-1 text-xs text-stone-600">Stripe test mode. You will approve a separate hosted payment for each merchant. No real money moves.</p>
          <button type="button" disabled={Boolean(busy)} onClick={() => void beginCheckout()} className="mt-3 w-full rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">{busy === "checkout" ? "Starting…" : "Start test checkout"}</button>
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
