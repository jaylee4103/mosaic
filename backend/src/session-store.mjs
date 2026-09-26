import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const sessionFile = fileURLToPath(new URL("../.local/checkout-session.json", import.meta.url));

export async function loadDemoSession() {
  try {
    const session = JSON.parse(await readFile(sessionFile, "utf8"));
    if (session.cartId !== "cart-demo-1" || !Array.isArray(session.requests)) {
      throw new Error("Invalid demo checkout session");
    }
    return session;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function saveDemoSession(session) {
  await mkdir(dirname(sessionFile), { recursive: true, mode: 0o700 });
  const temporaryFile = `${sessionFile}.tmp`;
  await writeFile(temporaryFile, JSON.stringify(session, null, 2), { mode: 0o600 });
  await rename(temporaryFile, sessionFile);
}
