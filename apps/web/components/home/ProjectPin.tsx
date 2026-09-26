"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ProjectPinProps = {
  id: string;
  title: string;
  vibe: string;
  x: string;
  y: string;
  rotation: number;
  pinColor: string;
};

export default function ProjectPin({
  id,
  title,
  vibe,
  x,
  y,
  rotation,
  pinColor,
}: ProjectPinProps) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);

  const openBoard = () => {
    setOpening(true);

    setTimeout(() => {
      router.push(`/boards/${id}`);
    }, 500);
  };

  return (
    <motion.button
      onClick={openBoard}
      className="absolute text-left"
      style={{
        left: x,
        top: y,
        zIndex: opening ? 100 : 10,
      }}
      initial={{
        rotate: rotation,
      }}
      animate={
        opening
          ? {
              scale: 2.2,
              rotate: 0,
              opacity: 0,
            }
          : {
              scale: 1,
              rotate: rotation,
              opacity: 1,
            }
      }
      whileHover={{
        scale: 1.06,
        rotate: 0,
        zIndex: 30,
      }}
      transition={{
        duration: opening ? 0.5 : 0.2,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div className="relative w-[290px] rounded-[4px] bg-[#f8f1e6] p-4 pb-5 shadow-[0_16px_30px_rgba(65,40,20,0.25)]">
        {/* pin */}
        <div
          className="absolute left-1/2 top-[-14px] h-7 w-7 -translate-x-1/2 rounded-full border border-black/20 shadow-md"
          style={{ backgroundColor: pinColor }}
        />

        {/* preview collage */}
        <div className="relative h-[160px] overflow-hidden bg-[#ddd0bd]">
          <div className="absolute left-4 top-5 h-[90px] w-[105px] rotate-[-5deg] bg-[#eee5d5] shadow-md" />

          <div className="absolute right-5 top-7 h-[100px] w-[85px] rotate-[5deg] bg-[#b7a48a] shadow-md" />

          <div className="absolute bottom-3 left-[35%] h-[70px] w-[90px] rotate-[2deg] bg-[#d8c6aa] shadow-md" />
        </div>

        <h2 className="mt-4 font-serif text-[22px] font-semibold text-stone-900">
          {title}
        </h2>

        <div className="mt-3 inline-block rotate-[-1deg] bg-[#fff0a6] px-4 py-2 shadow-sm">
          <p className="font-serif text-sm text-stone-700">{vibe}</p>
        </div>

        <p className="mt-4 text-xs uppercase tracking-[0.18em] text-stone-400 opacity-0 transition group-hover:opacity-100">
          Open board
        </p>
      </div>
    </motion.button>
  );
}