import { BoardDetail } from "@/components/board/BoardDetail";

// Next.js 15: `params` is a Promise. If your project is on Next.js 14,
// change this to a plain `{ params }: { params: { boardId: string } }`
// and drop the `await`.
export default async function BoardDetailPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  return <BoardDetail boardId={boardId} />;
}
