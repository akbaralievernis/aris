import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";

export type ProviderMode = "server" | "user";

export async function resolveProviderKey({
  userId,
  mode
}: {
  userId: string | null;
  mode: ProviderMode;
}) {
  if (mode === "server") {
    const serverKey = process.env.OPENAI_API_KEY;
    if (!serverKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    return serverKey;
  }

  if (!userId) {
    throw new Error("User key mode requires authentication");
  }

  const secret = await prisma.userSecret.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: "openai"
      }
    }
  });

  if (!secret) {
    throw new Error("User has no stored provider key");
  }

  return decryptSecret({
    encryptedKey: secret.encryptedKey,
    iv: secret.iv,
    authTag: secret.authTag
  });
}
