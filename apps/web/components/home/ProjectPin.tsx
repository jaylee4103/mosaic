"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

type ProjectPinProps = {
  id: string;
  title: string;
  vibe: string;
  x: string;
  y: string;
  rotation: number;
  pinColor: string;
  previewImages: string[];
};

export default function ProjectPin({
  id,
  title,
  vibe,
  x,
  y,
  rotation,
  pinColor,
  previewImages,
}: ProjectPinProps) {
  const router = useRouter();

  return (
    <motion.button
      onClick={() => router.push(`/boards/${id}`)}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{
        scale: 1.06,
        rotate: 0,
        zIndex: 50,
        y: -6,
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      className="absolute w-[280px] text-left"
      style={{
        left: x,
        top: y,
        rotate: `${rotation}deg`,
      }}
    >
      <div className="relative rounded-[14px] bg-[#f7f2ea] p-4 pb-5 shadow-[0_16px_26px_rgba(0,0,0,0.16)] ring-1 ring-[rgba(0,0,0,0.06)]">
        <div
          className="absolute left-1/2 top-[-11px] z-20 h-7 w-7 -translate-x-1/2 rounded-full border-2 border-white shadow-md"
          style={{ backgroundColor: pinColor }}
        />

        <div className="rounded-[10px] bg-[#d7cbb8] p-3 shadow-inner">
          <div className="grid grid-cols-2 gap-3">
            <div className="relative h-[122px] overflow-hidden rounded-[4px] bg-white p-[8px] shadow-sm">
              <img
                src={previewImages[0]}
                alt={title}
                className="h-full w-full rounded-[2px] object-cover"
              />
            </div>

            <div className="relative h-[122px] overflow-hidden rounded-[2px] bg-[#f6efe5] p-[8px] shadow-sm">
              <img
                src={previewImages[1] ?? previewImages[0]}
                alt={title}
                className="h-full w-full rotate-[2deg] object-cover shadow-sm"
              />
            </div>

            <div className="relative -mt-1 h-[86px] overflow-hidden rounded-[4px] bg-white p-[7px] shadow-sm">
              <img
                src={previewImages[2] ?? previewImages[0]}
                alt={title}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="relative mt-1 h-[86px] overflow-hidden rounded-[4px] bg-[#efe4d1] p-[7px] shadow-sm">
              <img
                src={previewImages[3] ?? previewImages[1] ?? previewImages[0]}
                alt={title}
                className="h-full w-full -rotate-[2deg] object-cover"
              />
            </div>
          </div>
        </div>

        <h2 className="mt-4 text-[2rem] font-semibold leading-none tracking-[-0.03em] text-[#221d19]">
          {title}
        </h2>

        <div className="mt-4 inline-block rotate-[-1.6deg] bg-[#efe08a] px-4 py-2 text-[0.95rem] text-[#4a463d] shadow-sm">
          {vibe}
        </div>
      </div>
    </motion.button>
  );
}