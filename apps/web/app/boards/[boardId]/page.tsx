import { BoardDetail } from "@/components/board/BoardDetail";

export default async function BoardDetailPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  return <BoardDetail boardId={boardId} />;
}
