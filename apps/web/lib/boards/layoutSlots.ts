export interface LayoutSlot {
  left: string;
  top: string;
  rotate: number;
}

// Hand-placed so the board reads as a composed scatter, not a grid or
// random jitter. Only used at lg+ (see BoardSlot) — smaller screens fall
// back to a simple stacked list. Nudge these to taste once you see it live;
// they're tuned for a ~1200px+ wide board.
export const LAYOUT_SLOTS: LayoutSlot[] = [
  { left: "3%", top: "8%", rotate: -4 },
  { left: "27%", top: "5%", rotate: 3 },
  { left: "51%", top: "10%", rotate: -2 },
  { left: "74%", top: "6%", rotate: 4 },
  { left: "10%", top: "50%", rotate: 2 },
  { left: "34%", top: "46%", rotate: -3 },
  { left: "57%", top: "52%", rotate: 3 },
  { left: "74%", top: "44%", rotate: -4 },
];
