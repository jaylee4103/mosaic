import { Board, BoardImage, CreateBoardInput, VibeProfile } from "@/types/board";

const STORAGE_KEY = "vibeboards:v1";

function readAll(): Board[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Board[]) : [];
  } catch {
    return [];
  }
}

function writeAll(boards: Board[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function getBoards(): Promise<Board[]> {
  return readAll().sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function createBoard(input: CreateBoardInput): Promise<Board> {
  const images: BoardImage[] = await Promise.all(
    input.images.map(async ({ file, note }) => ({
      id: crypto.randomUUID(),
      image_url: await fileToDataUrl(file),
      note,
      created_at: new Date().toISOString(),
    }))
  );

  const board: Board = {
    id: crypto.randomUUID(),
    name: input.name.trim() || "Untitled board",
    images,
    vibe: null,
    created_at: new Date().toISOString(),
  };

  const boards = readAll();
  boards.push(board);
  writeAll(boards);

  // TODO(person 2/3): replace this with a real call, e.g.
  //   const res = await fetch(`/api/boards/${board.id}/analyze`, { method: "POST" });
  //   const { vibe } = await res.json();
  // For now we fake a vibe so the UI has something to render immediately.
  board.vibe = fakeVibe();
  writeAll(readAll().map((b) => (b.id === board.id ? board : b)));

  return board;
}

export async function addImagesToBoard(
  boardId: string,
  files: File[]
): Promise<Board | null> {
  const boards = readAll();
  const board = boards.find((b) => b.id === boardId);
  if (!board) return null;

  const newImages: BoardImage[] = await Promise.all(
    files.map(async (file) => ({
      id: crypto.randomUUID(),
      image_url: await fileToDataUrl(file),
      created_at: new Date().toISOString(),
    }))
  );
  board.images.push(...newImages);
  writeAll(boards);
  return board;
}

export async function deleteBoard(boardId: string): Promise<void> {
  writeAll(readAll().filter((b) => b.id !== boardId));
}

function fakeVibe(): VibeProfile {
  const options: VibeProfile[] = [
    {
      name: "Sun-Washed Mediterranean",
      description:
        "A relaxed Mediterranean aesthetic built on warm natural materials and soft neutrals.",
      colors: ["cream", "terracotta", "olive", "brown"],
      materials: ["linen", "wood", "ceramic", "rattan"],
      qualities: ["warm", "natural", "relaxed", "minimal"],
    },
    {
      name: "Quiet Coastal",
      description: "Faded blues and driftwood tones, unhurried and airy.",
      colors: ["sand", "sea glass", "driftwood", "chalk white"],
      materials: ["linen", "rope", "weathered wood"],
      qualities: ["breezy", "soft", "unhurried"],
    },
  ];
  return options[Math.floor(Math.random() * options.length)];
}
