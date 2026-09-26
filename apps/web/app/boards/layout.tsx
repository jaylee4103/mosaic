import { BoardsProvider } from "@/lib/boards/useBoards";
import { BulletinBoard } from "@/components/board/BulletinBoard";
import "./cork.css";

// This layout stays mounted for both /boards and /boards/[boardId].
// BulletinBoard lives here (not in page.tsx) on purpose: that's what lets
// the ProjectPin -> BoardDetail shared layoutId animation "zoom in" instead
// of doing a hard page swap.
export default function BoardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BoardsProvider>
      <div className="relative min-h-screen bg-[#f4ede1]">
        <BulletinBoard />
        {children}
      </div>
    </BoardsProvider>
  );
}
