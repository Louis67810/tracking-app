import { MinusIcon, PlayIcon, PlusIcon, StopIcon, XMarkIcon } from "@heroicons/react/24/solid";
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
  const [isExitPromptOpen, setIsExitPromptOpen] = useState(false);
  const [isExitHolding, setIsExitHolding] = useState(false);
  const pageRef = useRef(null);
  const audioRef = useRef(null);
  const ambientRef = useRef(null);
  const exitHoldRef = useRef(null);

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

  useEffect(
    () => () => {
      if (exitHoldRef.current) {
        window.clearTimeout(exitHoldRef.current);
      }
    },
    []
  );

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
    pageRef.current?.scrollTo({ top: 0 });

    if (mode !== "timer" || remainingSeconds === 0) {
      setRemainingSeconds(durationMinutes * 60);
    }

    setMode("timer");
    setIsRunning(true);
  }

  function startFree() {
    pageRef.current?.scrollTo({ top: 0 });

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

  function stopSession() {
    if (exitHoldRef.current) {
      window.clearTimeout(exitHoldRef.current);
      exitHoldRef.current = null;
    }

    setIsRunning(false);
    setIsExitPromptOpen(false);
    setIsExitHolding(false);
    setMode("idle");
    setElapsedSeconds(0);
    setRemainingSeconds(durationMinutes * 60);
  }

  function startExitHold() {
    setIsExitHolding(true);

    if (exitHoldRef.current) {
      window.clearTimeout(exitHoldRef.current);
    }

    exitHoldRef.current = window.setTimeout(stopSession, 900);
  }

  function cancelExitHold() {
    setIsExitHolding(false);

    if (exitHoldRef.current) {
      window.clearTimeout(exitHoldRef.current);
      exitHoldRef.current = null;
    }
  }

  return (
    <section ref={pageRef} className={`focus-page page-surface ${isRunning ? "is-session-active" : ""}`}>
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
        className="focus-primary"
        type="button"
        onClick={startTimer}
      >
        <PlayIcon width={16} height={16} />
        <span>{mode === "timer" && isRunning ? "Pause" : "Démarrer"}</span>
      </button>

      <button
        className="focus-secondary"
        type="button"
        onClick={startFree}
      >
        <PlayIcon width={16} height={16} />
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

      {isRunning && (
        <div className="focus-session-overlay" role="dialog" aria-label="Session focus en cours">
          <div className="focus-session-panel">
            <button className="focus-session-close" type="button" onClick={() => setIsExitPromptOpen(true)} aria-label="Quitter la session">
              <XMarkIcon width={28} height={28} />
            </button>
            <div className="focus-session-clock" aria-live="polite">
              {displayValue}
            </div>
            <div className="focus-session-playlists" aria-label="Sons focus">
              {playlists.map((playlist, index) => (
                <button
                  className={`focus-session-sound ${activePlaylist === index ? "is-active" : ""}`}
                  type="button"
                  key={playlist.title}
                  onClick={() => playPlaylist(playlist, index)}
                >
                  <span>{playlist.title}</span>
                  <small>{activePlaylist === index ? "En boucle" : "Playlist"}</small>
                </button>
              ))}
            </div>
            <button className="focus-stop-button" type="button" onClick={() => setIsExitPromptOpen(true)}>
              <StopIcon width={16} height={16} />
              Stopper
            </button>

            {isExitPromptOpen && (
              <div className="early-exit-sheet" role="alertdialog" aria-label="Partir tôt">
                <div className="early-exit-handle" aria-hidden="true" />
                <div className="early-exit-icon" aria-hidden="true">
                  <XMarkIcon width={32} height={32} />
                </div>
                <h2>Partir tôt ?</h2>
                <p>N'abandonne pas, tu as commencé pour une raison.</p>
              <button
                className={`early-exit-hold ${isExitHolding ? "is-holding" : ""}`}
                type="button"
                onPointerDown={startExitHold}
                onPointerUp={cancelExitHold}
                  onPointerCancel={cancelExitHold}
                onPointerLeave={cancelExitHold}
              >
                <span>{isExitHolding ? "Maintenez appuyé..." : "Maintiens pour partir"}</span>
              </button>
                <button className="early-exit-cancel" type="button" onClick={() => setIsExitPromptOpen(false)}>
                  Laisse tomber
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
