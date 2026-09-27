"use client";

import { useEffect, useRef, useState } from "react";
import { useBoards } from "@/lib/boards/useBoards";
import type { Board } from "@/types/board";

export function DeleteBoardDialog({
  board,
  onClose,
}: {
  board: Board;
  onClose: () => void;
}) {
  const { deleteBoard } = useBoards();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !deleting) {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleting, onClose]);

  async function confirmDelete() {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteBoard(board.id);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete this board");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-board-title"
        aria-describedby="delete-board-description"
        className="w-full max-w-md rounded-xl bg-[#faf6ee] p-6 shadow-2xl"
      >
        <h2 id="delete-board-title" className="font-[family-name:var(--font-fraunces)] text-2xl text-stone-900">
          Delete “{board.name}”?
        </h2>
        <p id="delete-board-description" className="mt-2 text-sm text-stone-600">
          This permanently removes the board, its images, and vibe profile. Shopping and checkout records are kept.
        </p>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            disabled={deleting}
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm text-stone-700 hover:bg-stone-200 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={() => void confirmDelete()}
            className="rounded-full bg-red-700 px-5 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-40"
          >
            {deleting ? "Deleting…" : "Delete board"}
          </button>
        </div>
      </div>
    </div>
  );
}
