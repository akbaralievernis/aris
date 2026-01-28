"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type AssistantStatus =
  | "IDLE"
  | "HOTWORD_DETECTED"
  | "LISTENING"
  | "END_OF_SPEECH"
  | "THINKING"
  | "SPEAKING"
  | "ERROR";

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

function loadSettings(): Settings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }
  const raw = window.localStorage.getItem("aris.settings");
  if (!raw) {
    return DEFAULT_SETTINGS;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function VoiceAssistant() {
  const [status, setStatus] = useState<AssistantStatus>("IDLE");
  const [transcript, setTranscript] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [wakeWordAvailable, setWakeWordAvailable] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const lastVoiceRef = useRef<number>(0);
  const hasSpeechRef = useRef<boolean>(false);
  const monitoringRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const ttsPlayingRef = useRef(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("aris.settings", JSON.stringify(settings));
    }
  }, [settings]);

  const statusLabel = useMemo(() => {
    switch (status) {
      case "IDLE":
        return "Тынч (ойготкуч сөздү күтүп жатат)";
      case "HOTWORD_DETECTED":
        return "Ойготкуч сөз табылды";
      case "LISTENING":
        return "Угууда";
      case "END_OF_SPEECH":
        return "Үн токтоду";
      case "THINKING":
        return "Ойлонууда";
      case "SPEAKING":
        return "Сүйлөп жатат";
      case "ERROR":
        return "Ката";
      default:
        return status;
    }
  }, [status]);

  const ensureAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    if (!streamRef.current) {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;
    }

    if (!analyserRef.current && audioContextRef.current && streamRef.current) {
      const source = audioContextRef.current.createMediaStreamSource(
        streamRef.current
      );
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    }
  }, []);

  const stopMonitoring = useCallback(() => {
    if (monitoringRef.current) {
      cancelAnimationFrame(monitoringRef.current);
      monitoringRef.current = null;
    }
  }, []);

  const monitorAudio = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) {
      return;
    }

    analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
    const rms = Math.sqrt(
      dataArrayRef.current.reduce((sum, value) => {
        const normalized = (value - 128) / 128;
        return sum + normalized * normalized;
      }, 0) / dataArrayRef.current.length
    );

    const now = Date.now();
    const threshold = settings.vadThreshold;

    if (rms > threshold) {
      lastVoiceRef.current = now;
      hasSpeechRef.current = true;

      if (status === "SPEAKING") {
        if (!ttsPlayingRef.current) {
          setStatus("LISTENING");
        } else {
          stopTts();
          startListening();
        }
      }
    }

    if (status === "LISTENING" && hasSpeechRef.current) {
      if (now - lastVoiceRef.current > settings.silenceMs) {
        setStatus("END_OF_SPEECH");
        stopListening();
      }
    }

    monitoringRef.current = requestAnimationFrame(monitorAudio);
  }, [settings.silenceMs, settings.vadThreshold, status]);

  const startMonitoring = useCallback(async () => {
    await ensureAudioContext();
    if (!monitoringRef.current) {
      monitoringRef.current = requestAnimationFrame(monitorAudio);
    }
  }, [ensureAudioContext, monitorAudio]);

  const stopWakeWord = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const stopTts = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    ttsPlayingRef.current = false;
  }, []);

  const startListening = useCallback(async () => {
    setError(null);
    setAnswer("");
    setTranscript("");
    setStatus("LISTENING");
    stopWakeWord();
    await ensureAudioContext();
    await startMonitoring();

    if (!streamRef.current) {
      return;
    }

    chunksRef.current = [];
    hasSpeechRef.current = false;
    lastVoiceRef.current = Date.now();

    const recorder = new MediaRecorder(streamRef.current, {
      mimeType: "audio/webm"
    });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      void sendAudio(blob);
    };

    recorder.start();
  }, [ensureAudioContext, startMonitoring, stopWakeWord]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const playTts = useCallback((audioBase64: string) => {
    const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
    audioRef.current = audio;
    ttsPlayingRef.current = true;
    setStatus("SPEAKING");
    stopWakeWord();
    void startMonitoring();

    audio.onended = () => {
      ttsPlayingRef.current = false;
      setStatus("IDLE");
      if (settings.mode === "wake") {
        startWakeWord();
      }
    };

    audio.onerror = () => {
      ttsPlayingRef.current = false;
      setStatus("ERROR");
      setError("Аудио ойнотуу мүмкүн болбой калды.");
    };

    void audio.play();
  }, [settings.mode, startMonitoring, stopWakeWord]);

  const sendAudio = useCallback(
    async (blob: Blob) => {
      setStatus("THINKING");
      const formData = new FormData();
      formData.append("audio", blob, "speech.webm");
      formData.append("providerMode", settings.providerMode);

      try {
        const response = await fetch("/api/voice", {
          method: "POST",
          body: formData
        });
        if (!response.ok) {
          const payload = await response.json();
          throw new Error(payload.error ?? "Server error");
        }
        const payload = (await response.json()) as {
          transcript: string;
          answerText: string;
          audioBase64: string;
        };
        setTranscript(payload.transcript);
        setAnswer(payload.answerText);
        playTts(payload.audioBase64);
      } catch (err) {
        setStatus("ERROR");
        setError(err instanceof Error ? err.message : "Белгисиз ката");
      }
    },
    [playTts, settings.providerMode]
  );

  const startWakeWord = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setWakeWordAvailable(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = "ky-KG";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const text = last[0]?.transcript?.toLowerCase() ?? "";
      if (text.includes(settings.wakeWord.toLowerCase())) {
        recognition.stop();
        setStatus("HOTWORD_DETECTED");
        void startListening();
      }
    };
    recognition.onerror = () => {
      setWakeWordAvailable(false);
    };
    recognition.onend = () => {
      if (settings.mode === "wake" && status === "IDLE") {
        recognition.start();
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, [settings.mode, settings.wakeWord, startListening, status]);

  useEffect(() => {
    if (settings.mode === "wake") {
      startWakeWord();
    } else {
      stopWakeWord();
    }

    return () => {
      stopWakeWord();
    };
  }, [settings.mode, startWakeWord, stopWakeWord]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" && status === "IDLE") {
        event.preventDefault();
        void startListening();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [startListening, status]);

  useEffect(() => {
    return () => {
      stopMonitoring();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      audioContextRef.current?.close();
    };
  }, [stopMonitoring]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              Status
            </p>
            <p className="text-2xl font-semibold text-slate-100">{statusLabel}</p>
          </div>
          <button
            type="button"
            className="rounded-full bg-cyan-500/90 hover:bg-cyan-400 text-slate-950 px-8 py-4 text-lg font-semibold transition"
            onClick={() => startListening()}
            disabled={status === "LISTENING" || status === "THINKING"}
          >
            Микрофонду иштетүү
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-slate-950/60 p-4 border border-slate-800">
            <p className="text-sm text-slate-400">Транскрипция</p>
            <p className="text-lg text-slate-100 min-h-[4rem]">
              {transcript || "..."}
            </p>
          </div>
          <div className="rounded-xl bg-slate-950/60 p-4 border border-slate-800 md:col-span-2">
            <p className="text-sm text-slate-400">Жооп</p>
            <p className="text-lg text-slate-100 min-h-[4rem]">
              {answer || "..."}
            </p>
          </div>
        </div>

        {error ? (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        ) : null}
      </div>

      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-100">Кыска эскертмелер</h2>
        <ul className="mt-3 text-sm text-slate-300 space-y-2">
          <li>• Wake word режими — эксперименталдык (браузер чектөөлөрүнө байланыштуу).</li>
          <li>• Push-to-talk ишенимдүү. Space баскычы да иштейт.</li>
          <li>• Кайра сүйлөп кетсеңиз (barge-in), аудио токтоп кайра угат.</li>
        </ul>
        {!wakeWordAvailable && settings.mode === "wake" ? (
          <p className="mt-3 text-xs text-amber-400">
            Бул браузер wake word режимин колдобойт. Push-to-talk сунушталат.
          </p>
        ) : null}
      </div>
    </div>
  );
}
