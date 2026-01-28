import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
import { z } from "zod";

const SecretSchema = z.object({
  providerKey: z.string().min(10)
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = await prisma.userSecret.findUnique({
    where: {
      userId_provider: {
        userId: session.user.id,
        provider: "openai"
      }
    }
  });

  return NextResponse.json({ hasKey: Boolean(secret) });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = SecretSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const encrypted = encryptSecret(parsed.data.providerKey);
  await prisma.userSecret.upsert({
    where: {
      userId_provider: {
        userId: session.user.id,
        provider: "openai"
      }
    },
    update: encrypted,
    create: {
      userId: session.user.id,
      provider: "openai",
      ...encrypted
    }
  });

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.userSecret.deleteMany({
    where: {
      userId: session.user.id,
      provider: "openai"
    }
  });

  return NextResponse.json({ success: true });
}
