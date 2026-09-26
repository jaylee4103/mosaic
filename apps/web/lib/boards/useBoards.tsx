"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Board, CreateBoardInput } from "@/types/board";
import * as store from "./store";

interface BoardsContextValue {
  boards: Board[];
  loading: boolean;
  createBoard: (input: CreateBoardInput) => Promise<Board>;
  addImages: (boardId: string, files: File[]) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const BoardsContext = createContext<BoardsContextValue | null>(null);

export function BoardsProvider({ children }: { children: React.ReactNode }) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setBoards(await store.getBoards());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createBoard = useCallback(
    async (input: CreateBoardInput) => {
      const board = await store.createBoard(input);
      await refresh();
      return board;
    },
    [refresh]
  );

  const addImages = useCallback(
    async (boardId: string, files: File[]) => {
      await store.addImagesToBoard(boardId, files);
      await refresh();
    },
    [refresh]
  );

  const removeBoard = useCallback(
    async (boardId: string) => {
      await store.deleteBoard(boardId);
      await refresh();
    },
    [refresh]
  );

  return (
    <BoardsContext.Provider
      value={{
        boards,
        loading,
        createBoard,
        addImages,
        deleteBoard: removeBoard,
        refresh,
      }}
    >
      {children}
    </BoardsContext.Provider>
  );
}

export function useBoards() {
  const ctx = useContext(BoardsContext);
  if (!ctx) throw new Error("useBoards must be used inside <BoardsProvider>");
  return ctx;
}
