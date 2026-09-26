import test from "node:test";
import assert from "node:assert/strict";
import { createGuestSessionService, guestCookie, hashGuestToken, readGuestToken } from "../src/guest-session.mjs";

test("guest cookie resumes the same session and stores only a token hash", async () => {
  const records = new Map();
  const db = {
    from(table) {
      assert.equal(table, "guest_sessions");
      return {
        select() {
          return {
            eq(_field, hash) {
              return { async maybeSingle() { return { data: records.get(hash) ?? null, error: null }; } };
            },
          };
        },
        insert(row) {
          return {
            select() {
              return {
                async single() {
                  const data = { id: `guest-${records.size + 1}`, expires_at: row.expires_at };
                  records.set(row.token_hash, data);
                  return { data, error: null };
                },
              };
            },
          };
        },
      };
    },
  };
  const now = new Date("2026-09-26T12:00:00Z");
  const token = "a".repeat(64);
  const service = createGuestSessionService(db, { now: () => now, newToken: () => token });
  const headers = {};
  const response = { setHeader(name, value) { headers[name] = value; } };

  assert.equal(await service.getOrCreate({ headers: {} }, response), "guest-1");
  assert.ok(headers["set-cookie"].includes("HttpOnly"));
  assert.ok(headers["set-cookie"].includes("SameSite=Lax"));
  assert.equal(records.has(hashGuestToken(token)), true);
  assert.equal(records.has(token), false);
  assert.equal(readGuestToken(`other=value; mosaic_guest=${token}`), token);
  assert.equal(await service.getOrCreate({ headers: { cookie: headers["set-cookie"] } }, response), "guest-1");
  assert.equal(records.size, 1);
  assert.ok(guestCookie(token, { secure: true }).includes("; Secure"));
});
