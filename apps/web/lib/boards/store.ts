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
  items: { id: string; productId: string; quantity: number }[];
  totalCents: number;
  currency: string;
};

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

function stringFacet(facets: Record<string, unknown>, key: string): string[] {
  const value = facets[key];
  return typeof value === "string" && value.length > 0 ? [value.replaceAll("_", " ")] : [];
}

function mapVibe(vibe: ApiVibe | null): VibeProfile | null {
  if (!vibe) return null;
  const facets = vibe.profile?.facets ?? {};
  return {
    name: vibe.name,
    description: vibe.description,
    colors: [...stringFacet(facets, "color_palette"), ...stringFacet(facets, "color_tone")],
    materials: stringFacet(facets, "material"),
    qualities: ["style_archetype", "era_mood", "texture_quality", "energy_mood"]
      .flatMap((key) => stringFacet(facets, key)),
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

export async function deleteBoard(boardId: string): Promise<void> {
  await request(`/api/boards/${encodeURIComponent(boardId)}`, { method: "DELETE" });
}

export async function searchProducts(query: string): Promise<Product[]> {
  const params = new URLSearchParams({ query });
  const { products } = await request<{ products: Product[] }>(`/api/products/search?${params}`);
  return products;
}

export async function getCart(boardId: string): Promise<Cart> {
  return request<Cart>(`/api/boards/${encodeURIComponent(boardId)}/cart`);
}

export async function addCartItem(boardId: string, productId: string): Promise<Cart> {
  return request<Cart>(`/api/boards/${encodeURIComponent(boardId)}/cart/items`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productId, quantity: 1 }),
  });
}
