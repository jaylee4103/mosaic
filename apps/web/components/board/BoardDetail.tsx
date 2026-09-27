"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useBoards } from "@/lib/boards/useBoards";
import { addCartItem, getCart, searchProducts, type Cart, type Product } from "@/lib/boards/store";

export function BoardDetail({ boardId }: { boardId: string }) {
  const { boards, loading, addImages, analyzeBoard } = useBoards();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [analysisState, setAnalysisState] = useState<"idle" | "running">("idle");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [addingProduct, setAddingProduct] = useState<string | null>(null);
  const attemptedAnalysis = useRef<string | null>(null);
  const board = boards.find((item) => item.id === boardId);

  const runAnalysis = useCallback(async () => {
    setAnalysisState("running");
    setAnalysisError(null);
    try {
      await analyzeBoard(boardId);
    } catch (cause) {
      setAnalysisError(cause instanceof Error ? cause.message : "Could not analyze this board");
    } finally {
      setAnalysisState("idle");
    }
  }, [analyzeBoard, boardId]);

  useEffect(() => {
    if (!loading && board && board.images.length > 0 && !board.vibe && attemptedAnalysis.current !== boardId) {
      attemptedAnalysis.current = boardId;
      void runAnalysis();
    }
  }, [board, boardId, loading, runAnalysis]);

  useEffect(() => {
    void getCart(boardId).then(setCart).catch(() => undefined);
  }, [boardId]);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) return;
    setSearching(true);
    setActionError(null);
    try {
      setProducts(await searchProducts(message.trim()));
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Could not search products");
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd(productId: string) {
    setAddingProduct(productId);
    setActionError(null);
    try {
      setCart(await addCartItem(boardId, productId));
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Could not add product");
    } finally {
      setAddingProduct(null);
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setActionError(null);
    try {
      await addImages(boardId, Array.from(files));
      await runAnalysis();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Could not upload images");
    }
  }

  if (loading) return null;

  if (!board) {
    return (
      <Overlay onClose={() => router.push("/boards")}>
        <p className="rounded-2xl bg-[#faf6ee] p-6 text-stone-600 shadow-2xl">
          This board could not be found.
        </p>
      </Overlay>
    );
  }

  return (
    <Overlay onClose={() => router.push("/boards")}>
      <motion.div
        layoutId={`pin-${board.id}`}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="mx-auto w-full max-w-3xl rounded-2xl bg-[#faf6ee] p-6 shadow-2xl sm:p-10"
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {board.images.map((img) => (
            <div key={img.id} className="aspect-square overflow-hidden rounded-md border border-white bg-stone-200 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.image_url} alt="Inspiration" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>

        <h1 className="mt-6 font-[family-name:var(--font-fraunces)] text-3xl text-stone-900">{board.name}</h1>

        {board.vibe ? (
          <div className="mt-3">
            <p className="font-[family-name:var(--font-fraunces)] text-lg text-stone-700">{board.vibe.name}</p>
            {board.vibe.description && <p className="mt-1 text-sm text-stone-500">{board.vibe.description}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {[...board.vibe.colors, ...board.vibe.materials, ...board.vibe.qualities].map((tag) => (
                <span key={tag} className="rounded-full bg-[#f0e4c8] px-3 py-1 text-xs text-stone-700">{tag}</span>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-stone-600">
            {analysisState === "running" ? "Analyzing your images…" : "No vibe profile yet."}
          </p>
        )}

        {analysisError && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {analysisError} <button className="underline" onClick={() => void runAnalysis()}>Retry analysis</button>
          </p>
        )}

        <label className="mt-4 inline-block cursor-pointer text-sm text-stone-700 underline">
          Add more images
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(event) => { void handleUpload(event.target.files); event.target.value = ""; }}
          />
        </label>

        <div className="mt-8 border-t border-stone-200 pt-6">
          <p className="text-sm font-medium text-stone-700">What do you want to find for this vibe?</p>
          <form onSubmit={(event) => void handleSearch(event)} className="mt-2 flex gap-2">
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="a warm ceramic lamp"
              className="flex-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500"
            />
            <button disabled={searching || !message.trim()} className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
              {searching ? "searching…" : "search"}
            </button>
          </form>
          {actionError && <p role="alert" className="mt-3 text-sm text-red-700">{actionError}</p>}
          {cart && <p className="mt-4 text-sm text-stone-700">Cart: {cart.items.length} items · ${(cart.totalCents / 100).toFixed(2)}</p>}
          {products && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {products.length === 0 && <p className="text-sm text-stone-500">No products matched. Try another search.</p>}
              {products.map((product) => (
                <div key={product.id} className="flex gap-3 rounded-lg border border-stone-200 bg-white p-3">
                  {product.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.imageUrl} alt="" className="h-16 w-16 rounded object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-stone-900">{product.name}</p>
                    <p className="text-xs text-stone-500">{product.merchantName} · ${(product.priceCents / 100).toFixed(2)}</p>
                    <button
                      disabled={addingProduct === product.id || cart?.items.some((item) => item.productId === product.id)}
                      onClick={() => void handleAdd(product.id)}
                      className="mt-2 text-xs font-medium text-stone-800 underline disabled:opacity-40"
                    >
                      {cart?.items.some((item) => item.productId === product.id) ? "In cart" : "Add to cart"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </Overlay>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/60 p-4 py-10 sm:p-10">
      <button onClick={onClose} aria-label="Close board" className="fixed right-6 top-6 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-white text-stone-700 shadow-md">✕</button>
      {children}
    </motion.div>
  );
}
