export interface BoardImage {
  id: string;
  image_url: string; // data URL for now — swap for Supabase Storage URL later
  note?: string;
  created_at: string;
}

export interface VibeProfile {
  name: string;
  description: string;
  colors: string[];
  materials: string[];
  qualities: string[];
}

export interface Board {
  id: string;
  user_id?: string;
  name: string;
  images: BoardImage[];
  vibe: VibeProfile | null;
  created_at: string;
}

export interface CreateBoardInput {
  name: string;
  images: { file: File; note?: string }[];
}
