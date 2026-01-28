import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getMasterKey(): Buffer {
  const raw = process.env.MASTER_KEY;
  if (!raw) {
    throw new Error("MASTER_KEY env var is required");
  }
  const buffer = Buffer.from(raw, "base64");
  if (buffer.length !== 32) {
    throw new Error("MASTER_KEY must be base64-encoded 32 bytes");
  }
  return buffer;
}

export function encryptSecret(plainText: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getMasterKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedKey: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64")
  };
}

export function decryptSecret({
  encryptedKey,
  iv,
  authTag
}: {
  encryptedKey: string;
  iv: string;
  authTag: string;
}) {
  const key = getMasterKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedKey, "base64")),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}
