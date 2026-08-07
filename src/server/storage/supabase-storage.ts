import "server-only";
import { getSupabaseService } from "@/lib/supabase";

const BUCKET = "media";

const MAX_SIZES: Record<string, number> = {
  avatars: 5 * 1024 * 1024,
  covers: 5 * 1024 * 1024,
  posts: 10 * 1024 * 1024,
  products: 10 * 1024 * 1024,
  services: 10 * 1024 * 1024,
  jobs: 10 * 1024 * 1024,
  groups: 5 * 1024 * 1024,
  ids: 8 * 1024 * 1024,
  selfies: 8 * 1024 * 1024,
  general: 10 * 1024 * 1024,
};

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "application/pdf": "pdf",
};

function extFromMime(mime: string): string | null {
  return MIME_TO_EXT[mime] ?? null;
}

function generatePath(folder: string, mime: string): string {
  const ext = extFromMime(mime);
  if (!ext) throw new Error("INVALID_FILE_TYPE");
  const id = crypto.randomUUID();
  return `${folder}/${id}.${ext}`;
}

function generateFilePath(folder: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);
  const id = crypto.randomUUID().slice(0, 8);
  return `${folder}/${id}-${safe}`;
}

function getPublicUrl(path: string): string {
  const { data } = getSupabaseService().storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadFile(
  file: File,
  folder: string,
): Promise<{ url: string; path: string; type: "image" | "video" | "audio" | "other" }> {
  const max = MAX_SIZES[folder] ?? MAX_SIZES.general;
  if (file.size > max) throw new Error("FILE_TOO_LARGE");
  if (file.size === 0) throw new Error("FILE_REQUIRED");

  const path = generatePath(folder, file.type);
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await getSupabaseService().storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (error) throw new Error(error.message);

  const url = getPublicUrl(path);
  const type = file.type.startsWith("video/") ? "video" as const
    : file.type.startsWith("audio/") ? "audio" as const
    : file.type.startsWith("image/") ? "image" as const
    : "other" as const;

  return { url, path, type };
}

export async function uploadAnyFile(
  file: File,
  folder: string,
): Promise<{ url: string; path: string; name: string; size: number }> {
  const max = MAX_SIZES[folder] ?? MAX_SIZES.general;
  if (file.size > max) throw new Error("FILE_TOO_LARGE");
  if (file.size === 0) throw new Error("FILE_REQUIRED");

  const path = generateFilePath(folder, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await getSupabaseService().storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (error) throw new Error(error.message);

  const url = getPublicUrl(path);
  return { url, path, name: file.name, size: file.size };
}

export async function deleteFile(pathOrUrl: string): Promise<void> {
  if (!pathOrUrl) return;

  let path = pathOrUrl;
  // Extract path from full Supabase URL if needed
  const publicPrefix = `/storage/v1/object/public/${BUCKET}/`;
  const idx = pathOrUrl.indexOf(publicPrefix);
  if (idx !== -1) {
    path = pathOrUrl.slice(idx + publicPrefix.length);
  }

  const { error } = await getSupabaseService().storage.from(BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}

export function isSupabaseUrl(url: string | null): boolean {
  if (!url) return false;
  return url.includes("supabase.co/storage");
}

export function extractPathFromUrl(url: string): string | null {
  const publicPrefix = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(publicPrefix);
  if (idx === -1) return null;
  return url.slice(idx + publicPrefix.length);
}
