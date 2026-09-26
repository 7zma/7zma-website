import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { getServerEnv } from "@/lib/env";

const payloadSchema = z.object({ orderNumber: z.string().min(1).max(40), phone: z.string().min(8).max(20), expiresAt: z.number().int() });

function encryptionKey() {
  return createHash("sha256").update(getServerEnv().cronSecret).digest();
}

export function createTrackingToken(orderNumber: string, phone: string): string {
  const payload = Buffer.from(JSON.stringify({ orderNumber, phone, expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000 }));
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function readTrackingToken(token: string) {
  if (token.length > 512 || !/^[A-Za-z0-9_-]+$/.test(token)) return null;
  try {
    const packed = Buffer.from(token, "base64url");
    if (packed.length < 30 || packed.length > 380) return null;
    const iv = packed.subarray(0, 12);
    const authTag = packed.subarray(12, 28);
    const body = packed.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(authTag);
    const clear = Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
    const parsed = payloadSchema.safeParse(JSON.parse(clear) as unknown);
    if (!parsed.success || parsed.data.expiresAt < Date.now()) return null;
    return { orderNumber: parsed.data.orderNumber, phone: parsed.data.phone };
  } catch {
    return null;
  }
}
