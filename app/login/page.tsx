"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false
    });
    if (result?.error) {
      setError("Кирүү мүмкүн болбой калды.");
    } else {
      window.location.href = "/";
    }
  };

  return (
    <main className="min-h-screen px-6 py-10 md:px-16">
      <div className="max-w-md mx-auto space-y-6">
        <Link href="/" className="text-sm text-cyan-300">← Башкы бет</Link>
        <h1 className="text-3xl font-bold text-slate-100">Кирүү</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm text-slate-300">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-2 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-300">Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="mt-2 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-cyan-500 text-slate-950 px-4 py-2 font-semibold"
          >
            Кирүү
          </button>
        </form>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <p className="text-sm text-slate-300">
          Аккаунтуңуз жокпу?{" "}
          <Link href="/register" className="text-cyan-300">
            Катталуу
          </Link>
        </p>
      </div>
    </main>
  );
}
