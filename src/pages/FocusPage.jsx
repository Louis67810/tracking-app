import { MinusIcon, PauseIcon, PlayIcon, PlusIcon } from "@heroicons/react/24/solid";
import { useEffect, useMemo, useRef, useState } from "react";
import ScoreRing from "../ui/ScoreRing.jsx";

const mainScore = 90;
const minDuration = 5;
const maxDuration = 240;

const playlists = [
  {
    title: "Deep focus",
    subtitle: "Boucle calme",
    src: ""
  },
  {
    title: "Night work",
    subtitle: "Ambiance lente",
    src: ""
  }
];

function formatClock(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function stopAudio(audioRef, ambientRef) {
  if (audioRef.current) {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current = null;
  }

  if (ambientRef.current) {
    ambientRef.current.oscillator?.stop();
    ambientRef.current.context?.close();
    ambientRef.current = null;
  }
}

export default function FocusPage() {
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [remainingSeconds, setRemainingSeconds] = useState(90 * 60);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [mode, setMode] = useState("idle");
  const [isRunning, setIsRunning] = useState(false);
  const [activePlaylist, setActivePlaylist] = useState(null);
  const audioRef = useRef(null);
  const ambientRef = useRef(null);

  useEffect(() => {
    if (mode === "timer" && !isRunning) {
      setRemainingSeconds(durationMinutes * 60);
    }
  }, [durationMinutes, isRunning, mode]);

  useEffect(() => {
    if (!isRunning) return undefined;

    const interval = window.setInterval(() => {
      if (mode === "timer") {
        setRemainingSeconds((seconds) => {
          if (seconds <= 1) {
            window.clearInterval(interval);
            setIsRunning(false);
            return 0;
          }

          return seconds - 1;
        });
      }

      if (mode === "free") {
        setElapsedSeconds((seconds) => seconds + 1);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning, mode]);

  useEffect(() => () => stopAudio(audioRef, ambientRef), []);

  const displayValue = useMemo(() => {
    if (mode === "free") return formatClock(elapsedSeconds);
    if (mode === "timer" && (isRunning || remainingSeconds !== durationMinutes * 60)) {
      return formatClock(remainingSeconds);
    }
    return String(durationMinutes);
  }, [durationMinutes, elapsedSeconds, isRunning, mode, remainingSeconds]);

  function adjustDuration(delta) {
    if (isRunning) return;

    setDurationMinutes((minutes) => Math.max(minDuration, Math.min(maxDuration, minutes + delta)));
    setMode("idle");
  }

  function startTimer() {
    if (mode === "timer" && isRunning) {
      setIsRunning(false);
      return;
    }

    if (mode !== "timer" || remainingSeconds === 0) {
      setRemainingSeconds(durationMinutes * 60);
    }

    setMode("timer");
    setIsRunning(true);
  }

  function startFree() {
    if (mode === "free" && isRunning) {
      setIsRunning(false);
      return;
    }

    if (mode !== "free") {
      setElapsedSeconds(0);
    }

    setMode("free");
    setIsRunning(true);
  }

  async function playPlaylist(playlist, index) {
    if (activePlaylist === index) {
      stopAudio(audioRef, ambientRef);
      setActivePlaylist(null);
      return;
    }

    stopAudio(audioRef, ambientRef);
    setActivePlaylist(index);

    if (playlist.src) {
      const audio = new Audio(playlist.src);
      audio.loop = true;
      audioRef.current = audio;
      await audio.play().catch(() => {});
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = index === 0 ? 174 : 220;
    gain.gain.value = 0.025;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    ambientRef.current = { context, oscillator };
  }

  return (
    <section className="focus-page page-surface">
      <div className="focus-hero-art" aria-hidden="true" />

      <header className="top-row focus-top-row">
        <div className="avatar" aria-label="Profil" />
        <ScoreRing score={mainScore} />
      </header>

      <div className="divider focus-divider-top" />

      <h1 className="focus-title">Timer</h1>

      <div className="focus-timer-control" aria-label="Durée du timer">
        <button
          className="focus-adjust focus-adjust-left"
          type="button"
          onClick={() => adjustDuration(-5)}
          disabled={isRunning || durationMinutes <= minDuration}
          aria-label="Retirer 5 minutes"
        >
          <MinusIcon width={24} height={24} />
        </button>
        <span className="focus-time-value" aria-live="polite">
          {displayValue}
        </span>
        <button
          className="focus-adjust focus-adjust-right"
          type="button"
          onClick={() => adjustDuration(5)}
          disabled={isRunning || durationMinutes >= maxDuration}
          aria-label="Ajouter 5 minutes"
        >
          <PlusIcon width={24} height={24} />
        </button>
      </div>

      <button
        className={`focus-primary ${mode === "free" ? "is-dimmed" : ""}`}
        type="button"
        onClick={startTimer}
      >
        {mode === "timer" && isRunning ? <PauseIcon width={20} height={20} /> : <PlayIcon width={20} height={20} />}
        <span>{mode === "timer" && isRunning ? "Pause" : "Démarrer"}</span>
      </button>

      <button
        className={`focus-secondary ${mode === "timer" ? "is-dimmed" : ""}`}
        type="button"
        onClick={startFree}
      >
        {mode === "free" && isRunning ? <PauseIcon width={20} height={20} /> : <PlayIcon width={20} height={20} />}
        <span>{mode === "free" && isRunning ? "Pause libre" : "Démarrer librement"}</span>
      </button>

      <h2 className="focus-section-title">Pour toi</h2>

      <div className="focus-playlists" aria-label="Playlists focus">
        {playlists.map((playlist, index) => (
          <button
            className={`focus-playlist-card ${activePlaylist === index ? "is-active" : ""}`}
            type="button"
            key={playlist.title}
            onClick={() => playPlaylist(playlist, index)}
          >
            <span className="playlist-status">{activePlaylist === index ? "En boucle" : "Playlist"}</span>
            <span className="playlist-copy">
              <strong>{playlist.title}</strong>
              <span>{playlist.subtitle}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="focus-bottom-fade" aria-hidden="true" />
    </section>
  );
}
