import { getSupabaseAdmin } from "../src/supabase.mjs";

const bucketId = "mosaic-board-images";
const db = getSupabaseAdmin();
const { data: buckets, error: listError } = await db.storage.listBuckets();
if (listError) throw new Error(`Could not list storage buckets: ${listError.message}`);

const existing = buckets.find(({ id }) => id === bucketId);
if (existing?.public) {
  throw new Error(`${bucketId} already exists as a public bucket; make it private before continuing`);
}
const settings = {
  public: false,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  fileSizeLimit: "10MB",
};
if (!existing) {
  const { error } = await db.storage.createBucket(bucketId, settings);
  if (error) throw new Error(`Could not create storage bucket: ${error.message}`);
  process.stdout.write(`Created private bucket ${bucketId}\n`);
} else {
  const { error } = await db.storage.updateBucket(bucketId, settings);
  if (error) throw new Error(`Could not update storage bucket: ${error.message}`);
  process.stdout.write(`Configured private bucket ${bucketId}\n`);
}
