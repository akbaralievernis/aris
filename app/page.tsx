import Link from "next/link";
import VoiceAssistant from "@/components/VoiceAssistant";

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-10 md:px-16">
      <div className="max-w-5xl mx-auto space-y-10">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">ARIS</p>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-100">
              Кыргызча үн жардамчы
            </h1>
            <p className="mt-2 text-slate-300 max-w-2xl">
              Браузерде иштеген, ойготкуч сөз жана push-to-talk режимдери бар кыргызча
              акылдуу жардамчы.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="rounded-full border border-slate-700 px-5 py-2 text-sm text-slate-100 hover:border-cyan-400 hover:text-cyan-300 transition"
            >
              Орнотуулар
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-slate-800 px-5 py-2 text-sm text-slate-100 hover:bg-slate-700 transition"
            >
              Кирүү
            </Link>
          </div>
        </header>

        <VoiceAssistant />
      </div>
    </main>
  );
}
