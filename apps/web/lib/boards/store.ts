import type { Board, BoardImage, CreateBoardInput, VibeProfile } from "@/types/board";

type ApiBoard = { id: string; name: string; createdAt: string };
type ApiImage = { id: string; url: string; note: string | null; createdAt: string };
type ApiVibe = {
  name: string;
  description: string | null;
  profile: { facets?: Record<string, unknown> };
};
type ApiBoardDetail = ApiBoard & { images: ApiImage[]; vibeProfile: ApiVibe | null };

export type Product = {
  id: string;
  name: string;
  merchantName: string;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
};

export type Cart = {
  id: string;
  boardId: string;
  budgetCents: number | null;
  remainingCents: number | null;
  status: "open" | "checkout" | "completed" | "abandoned";
  items: { id: string; productId: string; quantity: number; locked: boolean; subtotalCents: number; product: Product | null }[];
  totalCents: number;
  currency: string;
};

export type Checkout = {
  id: string;
  boardId: string;
  cartId: string;
  status: string;
  totalCents: number;
  currency: string;
  approvalMode: "hosted_checkout" | "link_cli";
  merchantOrders: {
    id: string;
    merchantId: string;
    merchantName: string;
    amountCents: number;
    paymentStatus: string;
    paymentMethodType: string | null;
    linkVerified: boolean;
    errorMessage: string | null;
    checkoutUrl?: string | null;
  }[];
};

export type CartAction =
  | { type: "LOCK" | "UNLOCK" | "REMOVE" | "ADD"; productId: string }
  | { type: "REPLACE"; removeProductId: string; addProductId: string }
  | { type: "SET_BUDGET"; budgetCents: number | null };

export type ShoppingReply = { assistantMessage: string; cart: Cart; steps: number };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, cache: "no-store" });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body &&
      typeof body.error === "string" ? body.error : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body as T;
}

function facetTags(facets: Record<string, unknown>, key: string): string[] {
  const value = facets[key];
  const tags = Array.isArray(value) ? value : [value];
  return tags.filter((tag): tag is string => typeof tag === "string" && tag.length > 0)
    .map((tag) => tag.replaceAll("_", " "));
}

function mapVibe(vibe: ApiVibe | null): VibeProfile | null {
  if (!vibe) return null;
  const facets = vibe.profile?.facets ?? {};
  return {
    name: vibe.name,
    description: vibe.description,
    colors: ["color", "color_palette", "color_tone"].flatMap((key) => facetTags(facets, key)),
    materials: facetTags(facets, "material"),
    qualities: ["style", "quality", "terrain", "locale", "shape", "style_archetype", "era_mood", "texture_quality", "energy_mood"]
      .flatMap((key) => facetTags(facets, key)),
  };
}

function mapImage(image: ApiImage): BoardImage {
  return {
    id: image.id,
    image_url: image.url,
    note: image.note,
    created_at: image.createdAt,
  };
}

function mapBoard(board: ApiBoardDetail): Board {
  return {
    id: board.id,
    name: board.name,
    images: board.images.map(mapImage),
    vibe: mapVibe(board.vibeProfile),
    created_at: board.createdAt,
  };
}

export async function getBoards(): Promise<Board[]> {
  const { boards } = await request<{ boards: ApiBoard[] }>("/api/boards");
  return Promise.all(boards.map((board) => getBoard(board.id)));
}

export async function getBoard(boardId: string): Promise<Board> {
  const board = await request<ApiBoardDetail>(`/api/boards/${encodeURIComponent(boardId)}`);
  return mapBoard(board);
}

export async function createBoard(input: CreateBoardInput): Promise<Board> {
  const board = await request<ApiBoard>("/api/boards", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: input.name }),
  });
  try {
    for (const { file, note } of input.images) {
      await uploadImage(board.id, file, note);
    }
  } catch (error) {
    await deleteBoard(board.id).catch(() => undefined);
    throw error;
  }
  return getBoard(board.id);
}

async function uploadImage(boardId: string, file: File, note?: string): Promise<void> {
  const form = new FormData();
  form.set("image", file);
  if (note) form.set("note", note);
  await request(`/api/boards/${encodeURIComponent(boardId)}/images`, { method: "POST", body: form });
}

export async function addImagesToBoard(boardId: string, files: File[]): Promise<void> {
  for (const file of files) await uploadImage(boardId, file);
}

export async function analyzeBoard(boardId: string): Promise<void> {
  await request(`/api/boards/${encodeURIComponent(boardId)}/analyze`, { method: "POST" });
}

export async function previewVibe(boardId: string, scenario: "mediterranean" | "alpine"): Promise<void> {
  await request(`/api/boards/${encodeURIComponent(boardId)}/analyze/mock`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenario }),
  });
}

export async function deleteBoard(boardId: string): Promise<void> {
  await request(`/api/boards/${encodeURIComponent(boardId)}`, { method: "DELETE" });
}

export async function searchProducts(query: string, maxPriceCents?: number): Promise<Product[]> {
  const params = new URLSearchParams({ query });
  if (maxPriceCents !== undefined) params.set("maxPrice", String(maxPriceCents));
  const { products } = await request<{ products: Product[] }>(`/api/products/search?${params}`);
  return products;
}

export async function shopWithAgent(boardId: string, message: string): Promise<ShoppingReply> {
  return request<ShoppingReply>(`/api/boards/${encodeURIComponent(boardId)}/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message }),
  });
}

const inFlightCarts = new Map<string, Promise<Cart>>();

export function getCart(boardId: string): Promise<Cart> {
  const existing = inFlightCarts.get(boardId);
  if (existing) return existing;
  const pending = request<Cart>(`/api/boards/${encodeURIComponent(boardId)}/cart`)
    .finally(() => inFlightCarts.delete(boardId));
  inFlightCarts.set(boardId, pending);
  return pending;
}

export async function addCartItem(boardId: string, productId: string): Promise<Cart> {
  return request<Cart>(`/api/boards/${encodeURIComponent(boardId)}/cart/items`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productId, quantity: 1 }),
  });
}

export async function updateCartItem(boardId: string, itemId: string, patch: { quantity?: number; locked?: boolean }): Promise<Cart> {
  return request<Cart>(`/api/boards/${encodeURIComponent(boardId)}/cart/items/${encodeURIComponent(itemId)}`, {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch),
  });
}

export async function removeCartItem(boardId: string, itemId: string): Promise<Cart> {
  return request<Cart>(`/api/boards/${encodeURIComponent(boardId)}/cart/items/${encodeURIComponent(itemId)}`, { method: "DELETE" });
}

export async function setCartBudget(boardId: string, budgetCents: number | null): Promise<Cart> {
  return request<Cart>(`/api/boards/${encodeURIComponent(boardId)}/cart`, {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ budgetCents }),
  });
}

export async function applyCartActions(boardId: string, actions: CartAction[]): Promise<{ cart: Cart; results: { type: string; ok: boolean; error?: string }[] }> {
  return request(`/api/boards/${encodeURIComponent(boardId)}/cart/actions`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ actions }),
  });
}

export async function getCheckout(boardId: string): Promise<Checkout | null> {
  const response = await fetch(`/api/boards/${encodeURIComponent(boardId)}/checkout`, { cache: "no-store" });
  if (response.status === 404) return null;
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : `Request failed (${response.status})`);
  return body as Checkout;
}

export async function startCheckout(boardId: string): Promise<Checkout> {
  return request(`/api/boards/${encodeURIComponent(boardId)}/checkout`, { method: "POST" });
}

export async function preparePayments(boardId: string): Promise<Checkout> {
  return request(`/api/boards/${encodeURIComponent(boardId)}/checkout/payments`, { method: "POST" });
}

export async function refreshPayments(boardId: string): Promise<Checkout> {
  return request(`/api/boards/${encodeURIComponent(boardId)}/checkout/payments`);
}
