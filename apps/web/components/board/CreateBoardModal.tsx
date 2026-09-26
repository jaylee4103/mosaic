"use client";

import { useRef, useState } from "react";
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

  const previews = files.map((f) => URL.createObjectURL(f));

  function handleFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  }

  async function handleSubmit() {
    if (!name.trim() || files.length === 0) return;
    setSubmitting(true);
    const board = await createBoard({
      name,
      images: files.map((file) => ({ file })),
    });
    setSubmitting(false);
    onClose();
    router.push(`/boards/${board.id}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-[#faf6ee] p-6 shadow-2xl">
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl text-stone-900">
          new board
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          give it a name and drop in a few photos that capture the look.
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
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm text-stone-600 hover:bg-stone-200"
          >
            cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || files.length === 0 || submitting}
            className="rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {submitting ? "creating…" : "create board"}
          </button>
        </div>
      </div>
    </div>
  );
}
