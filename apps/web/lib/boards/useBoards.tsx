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
  error: string | null;
  createBoard: (input: CreateBoardInput) => Promise<Board>;
  addImages: (boardId: string, files: File[]) => Promise<void>;
  analyzeBoard: (boardId: string) => Promise<void>;
  previewVibe: (boardId: string, scenario: "mediterranean" | "alpine") => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const BoardsContext = createContext<BoardsContextValue | null>(null);

export function BoardsProvider({ children }: { children: React.ReactNode }) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setBoards(await store.getBoards());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load boards");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void store.getBoards()
      .then((result) => {
        if (!active) return;
        setBoards(result);
        setError(null);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load boards");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

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

  const analyzeBoard = useCallback(
    async (boardId: string) => {
      await store.analyzeBoard(boardId);
      await refresh();
    },
    [refresh]
  );

  const previewVibe = useCallback(
    async (boardId: string, scenario: "mediterranean" | "alpine") => {
      await store.previewVibe(boardId, scenario);
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
        error,
        createBoard,
        addImages,
        analyzeBoard,
        previewVibe,
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
