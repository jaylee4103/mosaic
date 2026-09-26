"use client";

import { motion } from "framer-motion";

export function PlaceholderPin({
  label,
  rotate,
  onClick,
}: {
  label: string;
  rotate: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      style={{ rotate }}
      whileHover={{ rotate: 0, y: -6, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="group relative flex aspect-square w-64 flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed border-[#a9825a]/50 bg-[#f6efe1]/60 text-[#8a6a48] shadow-sm transition-colors hover:border-[#a9825a] hover:bg-[#f6efe1]/90"
    >
      <span className="text-3xl leading-none">+</span>
      <span className="text-sm">{label}</span>
    </motion.button>
  );
}
