"use client";

import { useState } from "react";

type Props = {
  onClose: () => void;
  onCreate: (title: string, vibe: string) => void;
};

export default function CreateBoardModal({
  onClose,
  onCreate,
}: Props) {
  const [title, setTitle] = useState("");
  const [vibe, setVibe] = useState("");

  function handleSubmit() {
    if (!title.trim()) return;

    onCreate(
      title,
      vibe.trim() || "soft · curated · aesthetic"
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] bg-[#fbf8f3] p-7 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-[#221d19]">
            Create a board
          </h2>

          <button
            onClick={onClose}
            className="text-2xl text-neutral-400 hover:text-black"
          >
            ×
          </button>
        </div>

        <label className="mb-2 block text-sm font-medium text-[#433d38]">
          Board title
        </label>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Dream Apartment"
          className="mb-5 w-full rounded-2xl border border-[#ded6cc] bg-white px-4 py-3 outline-none focus:border-black"
        />

        <label className="mb-2 block text-sm font-medium text-[#433d38]">
          Vibe
        </label>

        <textarea
          value={vibe}
          onChange={(e) => setVibe(e.target.value)}
          placeholder="warm · coastal · feminine"
          className="min-h-[120px] w-full resize-none rounded-2xl border border-[#ded6cc] bg-white px-4 py-3 outline-none focus:border-black"
        />

        <button
          onClick={handleSubmit}
          className="mt-6 w-full rounded-2xl bg-[#171412] py-3 font-medium text-white"
        >
          Create Board
        </button>
      </div>
    </div>
  );
}