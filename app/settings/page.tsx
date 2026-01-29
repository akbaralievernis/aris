"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Settings = {
  mode: "wake" | "push";
  wakeWord: string;
  silenceMs: number;
  vadThreshold: number;
  providerMode: "server" | "user";
};

const DEFAULT_SETTINGS: Settings = {
  mode: "push",
  wakeWord: "ARIS",
  silenceMs: 900,
  vadThreshold: 0.02,
  providerMode: "server"
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [providerKey, setProviderKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("aris.settings");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<Settings>;
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch {
        setSettings(DEFAULT_SETTINGS);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("aris.settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const loadSecret = async () => {
      try {
        const res = await fetch("/api/user/secret");
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as { hasKey: boolean };
        setHasKey(data.hasKey);
      } catch {
        setHasKey(false);
      }
    };

    void loadSecret();
  }, []);

  const saveKey = async () => {
    setMessage(null);
    const res = await fetch("/api/user/secret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerKey })
    });
    if (res.ok) {
      setHasKey(true);
      setProviderKey("");
      setMessage("Ключ сакталды.");
    } else {
      setMessage("Ключ сакталбай калды. Кирүү зарыл болушу мүмкүн.");
    }
  };

  const deleteKey = async () => {
    setMessage(null);
    const res = await fetch("/api/user/secret", { method: "DELETE" });
    if (res.ok) {
      setHasKey(false);
      setMessage("Ключ өчүрүлдү.");
    } else {
      setMessage("Ключ өчүрүлбөй калды.");
    }
  };

  return (
    <main className="min-h-screen px-6 py-10 md:px-16">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="space-y-2">
          <Link href="/" className="text-sm text-cyan-300">← Башкы бет</Link>
          <h1 className="text-3xl font-bold text-slate-100">Орнотуулар</h1>
          <p className="text-slate-300">
            Ойготкуч сөз жана үн сенситивдүүлүгүн тандаңыз.
          </p>
        </header>

        <section className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Үн режими</h2>
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="mode"
                checked={settings.mode === "push"}
                onChange={() => setSettings({ ...settings, mode: "push" })}
              />
              <span>Push-to-talk (сунушталат)</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="mode"
                checked={settings.mode === "wake"}
                onChange={() => setSettings({ ...settings, mode: "wake" })}
              />
              <span>Wake word (beta)</span>
            </label>
          </div>

          <label className="block">
            <span className="text-sm text-slate-300">Wake word</span>
            <input
              type="text"
              value={settings.wakeWord}
              onChange={(event) =>
                setSettings({ ...settings, wakeWord: event.target.value })
              }
              className="mt-2 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-300">Silence timeout (ms)</span>
            <input
              type="number"
              min={400}
              max={2000}
              value={settings.silenceMs}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  silenceMs: Number(event.target.value)
                })
              }
              className="mt-2 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-300">Sensitivity</span>
            <input
              type="range"
              min={0.005}
              max={0.08}
              step={0.005}
              value={settings.vadThreshold}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  vadThreshold: Number(event.target.value)
                })
              }
              className="mt-2 w-full"
            />
            <div className="text-xs text-slate-400">
              Азыркы мааниси: {settings.vadThreshold.toFixed(3)}
            </div>
          </label>
        </section>

        <section className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Provider режими</h2>
          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="providerMode"
                checked={settings.providerMode === "server"}
                onChange={() =>
                  setSettings({ ...settings, providerMode: "server" })
                }
              />
              <span>Server-managed key (default)</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="providerMode"
                checked={settings.providerMode === "user"}
                onChange={() =>
                  setSettings({ ...settings, providerMode: "user" })
                }
              />
              <span>Per-user key (шифрленген)</span>
            </label>
          </div>

          {settings.providerMode === "user" ? (
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm text-slate-300">OpenAI API Key</span>
                <input
                  type="password"
                  value={providerKey}
                  onChange={(event) => setProviderKey(event.target.value)}
                  className="mt-2 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2"
                  placeholder="sk-..."
                />
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-lg bg-cyan-500 text-slate-950 px-4 py-2"
                  onClick={saveKey}
                >
                  Сактоо
                </button>
                {hasKey ? (
                  <button
                    type="button"
                    className="rounded-lg border border-slate-700 px-4 py-2"
                    onClick={deleteKey}
                  >
                    Өчүрүү
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {message ? <p className="text-sm text-amber-300">{message}</p> : null}
        </section>
      </div>
    </main>
  );
}
