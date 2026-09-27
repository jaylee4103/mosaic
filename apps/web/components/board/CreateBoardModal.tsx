"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useBoards } from "@/lib/boards/useBoards";

export function CreateBoardModal({
  initialName = "",
  onClose,
}: {
  initialName?: string;
  onClose: () => void;
}) {
  const { createBoard } = useBoards();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initialName);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const previewUrls = useRef<string[]>([]);

  useEffect(() => {
    const urls = previewUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function handleFiles(list: FileList | null) {
    if (!list) return;
    const selected = Array.from(list);
    const invalid = selected.find((file) =>
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 4 * 1024 * 1024
    );
    if (invalid) {
      setError("Choose JPEG, PNG, or WebP images under 4 MB each.");
      return;
    }
    setError(null);
    setFiles((prev) => [...prev, ...selected]);
    const urls = selected.map((file) => URL.createObjectURL(file));
    previewUrls.current.push(...urls);
    setPreviews((prev) => [...prev, ...urls]);
  }

  async function handleSubmit() {
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const board = await createBoard({
        name,
        images: files.map((file) => ({ file })),
      });
      onClose();
      router.push(`/boards/${board.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create board");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-[#faf6ee] p-6 shadow-2xl">
        <h2 className="font-heading text-2xl text-stone-900">
          new board
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          give it a name. You can add inspiration photos now or later.
        </p>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="dream apartment"
          className="mt-4 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500"
        />

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 flex min-h-28 cursor-pointer flex-wrap gap-2 rounded-md border-2 border-dashed border-stone-300 p-3"
        >
          {previews.length === 0 && (
            <p className="m-auto text-sm text-stone-400">
              click or drag photos here
            </p>
          )}
          {previews.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" className="h-20 w-20 rounded-sm object-cover" />
          ))}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onClick={(event) => event.stopPropagation()}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm text-stone-600 hover:bg-stone-200"
          >
            cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || submitting}
            className="rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {submitting ? "creating…" : "create board"}
          </button>
        </div>
      </div>
    </div>
  );
}
