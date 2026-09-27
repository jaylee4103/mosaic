import { LayoutSlot } from "@/lib/boards/layoutSlots";

export function BoardSlot({
  slot,
  children,
}: {
  slot: LayoutSlot;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex w-full justify-center lg:absolute lg:block lg:w-auto lg:left-[var(--slot-left)] lg:top-[var(--slot-top)]"
      style={
        {
          "--slot-left": slot.left,
          "--slot-top": slot.top,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
