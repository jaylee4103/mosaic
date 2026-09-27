"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Board } from "@/types/board";

const PIN_COLORS = ["#c1440e", "#2f6f6a", "#3a5a40", "#b08900", "#3d4a99"];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function ProjectPin({
  board,
  rotate,
  onRequestDelete,
}: {
  board: Board;
  rotate: number;
  onRequestDelete: (board: Board) => void;
}) {
  const router = useRouter();
  const hash = hashString(board.id);
  const pinColor = PIN_COLORS[hash % PIN_COLORS.length];
  const photos = board.images.slice(0, 4);

  return (
    <motion.div
      layoutId={`pin-${board.id}`}
      style={{ rotate }}
      whileHover={{ rotate: 0, y: -6, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="group relative w-64 shrink-0"
    >
      <button
        type="button"
        onClick={() => router.push(`/boards/${board.id}`)}
        className="w-full rounded-sm bg-[#faf6ee] p-3 pb-5 text-left shadow-[0_8px_20px_rgba(0,0,0,0.18)]"
      >
        <span
          className="pointer-events-none absolute -top-3 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
          style={{ background: pinColor }}
        />

        <div className="grid grid-cols-2 gap-1.5">
          {photos.length > 0 ? (
            photos.map((img) => (
              <div
                key={img.id}
                className="aspect-square overflow-hidden rounded-[2px] border border-white bg-stone-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.image_url} alt="" className="h-full w-full object-cover" />
              </div>
            ))
          ) : (
            <div className="col-span-2 flex aspect-[2/1] items-center justify-center rounded-[2px] border border-dashed border-stone-400 text-xs text-stone-400">
              no photos yet
            </div>
          )}
        </div>

        <h3 className="mt-3 truncate font-heading text-lg text-stone-900">
          {board.name}
        </h3>

        {board.vibe && (
          <p className="mt-1 truncate text-xs text-stone-500">
            {board.vibe.qualities.slice(0, 3).join(" · ")}
          </p>
        )}
      </button>
      <button
        type="button"
        aria-label={`Delete ${board.name} board`}
        title={`Delete ${board.name}`}
        onClick={() => onRequestDelete(board)}
        className="absolute right-1 top-1 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-red-700 opacity-0 shadow-md transition hover:bg-red-50 hover:text-red-800 focus:opacity-100 focus:outline-2 focus:outline-offset-2 focus:outline-red-700 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <X aria-hidden="true" size={18} strokeWidth={2.5} />
      </button>
    </motion.div>
  );
}
