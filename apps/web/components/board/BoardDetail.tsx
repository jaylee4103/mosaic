"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useBoards } from "@/lib/boards/useBoards";

export function BoardDetail({ boardId }: { boardId: string }) {
  const { boards, loading } = useBoards();
  const router = useRouter();
  const [message, setMessage] = useState("");

  const board = boards.find((b) => b.id === boardId);

  if (loading) return null;

  if (!board) {
    return (
      <Overlay onClose={() => router.push("/boards")}>
        <p className="rounded-2xl bg-[#faf6ee] p-6 text-stone-600 shadow-2xl">
          that board doesn't exist (or hasn't finished loading).
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
            <div
              key={img.id}
              className="aspect-square overflow-hidden rounded-md border border-white bg-stone-200 shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.image_url} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>

        <h1 className="mt-6 font-[family-name:var(--font-fraunces)] text-3xl text-stone-900">
          {board.name}
        </h1>

        {board.vibe && (
          <div className="mt-3">
            <p className="font-[family-name:var(--font-fraunces)] text-lg text-stone-700">
              {board.vibe.name}
            </p>
            <p className="mt-1 text-sm text-stone-500">
              {board.vibe.qualities.join(" · ")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[...board.vibe.colors, ...board.vibe.materials].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[#f0e4c8] px-3 py-1 text-xs text-stone-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 border-t border-stone-200 pt-6">
          <p className="text-sm font-medium text-stone-700">
            what do you want to find for this vibe?
          </p>
          <div className="mt-2 flex gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="recommend things for my room under $300"
              className="flex-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500"
            />
            <button
              onClick={() => {
                // TODO(person 2/3): call POST /api/shop with
                //   { boardId: board.id, message, budget }
                // and render the returned products + actions below.
                alert("wire this up to POST /api/shop — see project plan §19");
              }}
              className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white"
            >
              ask
            </button>
          </div>
        </div>
      </motion.div>
    </Overlay>
  );
}

function Overlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/60 p-4 py-10 sm:p-10"
    >
      <button
        onClick={onClose}
        className="fixed right-6 top-6 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-white text-stone-700 shadow-md"
      >
        ✕
      </button>
      {children}
    </motion.div>
  );
}
