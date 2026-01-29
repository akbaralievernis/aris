"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    if (res.ok) {
      setMessage("Катталуу ийгиликтүү. Кирүү барагына өтүңүз.");
    } else {
      const payload = await res.json();
      setMessage(payload.error ?? "Ката пайда болду");
    }
  };

  return (
    <main className="min-h-screen px-6 py-10 md:px-16">
      <div className="max-w-md mx-auto space-y-6">
        <Link href="/" className="text-sm text-cyan-300">← Башкы бет</Link>
        <h1 className="text-3xl font-bold text-slate-100">Катталуу</h1>
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
            <span className="text-sm text-slate-300">Пароль (кеминде 8 символ)</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              className="mt-2 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-cyan-500 text-slate-950 px-4 py-2 font-semibold"
          >
            Катталуу
          </button>
        </form>
        {message ? <p className="text-sm text-amber-300">{message}</p> : null}
      </div>
    </main>
  );
}
