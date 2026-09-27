export interface BoardImage {
  id: string;
  image_url: string;
  note: string | null;
  created_at: string;
}

export interface VibeProfile {
  name: string;
  description: string | null;
  colors: string[];
  materials: string[];
  qualities: string[];
}

export interface Board {
  id: string;
  name: string;
  images: BoardImage[];
  vibe: VibeProfile | null;
  created_at: string;
}

export interface CreateBoardInput {
  name: string;
  images: { file: File; note?: string }[];
}
