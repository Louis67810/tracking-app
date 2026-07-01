import { CheckIcon, MinusIcon, PlayIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/solid";
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

function formatLongClock(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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
  const [isExitValidated, setIsExitValidated] = useState(false);
  const [areSessionControlsVisible, setSessionControlsVisible] = useState(false);
  const [exitSheetDragY, setExitSheetDragY] = useState(0);
  const [isExitSheetDragging, setIsExitSheetDragging] = useState(false);
  const pageRef = useRef(null);
  const audioRef = useRef(null);
  const ambientRef = useRef(null);
  const exitHoldRef = useRef(null);
  const exitCompleteRef = useRef(null);
  const exitSheetDragRef = useRef(null);

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
      if (exitCompleteRef.current) {
        window.clearTimeout(exitCompleteRef.current);
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

  const sessionDisplayValue = useMemo(() => {
    if (mode === "free") return formatLongClock(elapsedSeconds);
    return formatLongClock(remainingSeconds);
  }, [elapsedSeconds, mode, remainingSeconds]);

  function adjustDuration(delta) {
    if (isRunning) return;

    setDurationMinutes((minutes) => Math.max(minDuration, Math.min(maxDuration, minutes + delta)));
    setMode("idle");
  }

  async function ensurePlaylist(index) {
    if (typeof index !== "number" || activePlaylist === index) return;
    await playPlaylist(playlists[index], index);
  }

  async function startTimer(index) {
    pageRef.current?.scrollTo({ top: 0 });
    await ensurePlaylist(index);

    if (mode !== "timer" || remainingSeconds === 0) {
      setRemainingSeconds(durationMinutes * 60);
    }

    setSessionControlsVisible(false);
    setMode("timer");
    setIsRunning(true);
  }

  async function startFree(index) {
    pageRef.current?.scrollTo({ top: 0 });
    await ensurePlaylist(index);

    if (mode !== "free") {
      setElapsedSeconds(0);
    }

    setSessionControlsVisible(false);
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
    if (exitCompleteRef.current) {
      window.clearTimeout(exitCompleteRef.current);
      exitCompleteRef.current = null;
    }

    setIsRunning(false);
    setIsExitPromptOpen(false);
    setIsExitHolding(false);
    setIsExitValidated(false);
    setSessionControlsVisible(false);
    setExitSheetDragY(0);
    setIsExitSheetDragging(false);
    setMode("idle");
    setElapsedSeconds(0);
    setRemainingSeconds(durationMinutes * 60);
  }

  function startExitHold() {
    setIsExitHolding(true);
    setIsExitValidated(false);

    if (exitHoldRef.current) {
      window.clearTimeout(exitHoldRef.current);
    }

    exitHoldRef.current = window.setTimeout(() => {
      setIsExitHolding(false);
      setIsExitValidated(true);
      exitHoldRef.current = null;
      exitCompleteRef.current = window.setTimeout(stopSession, 1000);
    }, 1900);
  }

  function cancelExitHold() {
    if (isExitValidated) return;

    setIsExitHolding(false);

    if (exitHoldRef.current) {
      window.clearTimeout(exitHoldRef.current);
      exitHoldRef.current = null;
    }
  }

  function startExitSheetDrag(event) {
    if (event.target.closest("button")) return;

    exitSheetDragRef.current = { pointerId: event.pointerId, startY: event.clientY, currentY: 0 };
    setIsExitSheetDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveExitSheetDrag(event) {
    const drag = exitSheetDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const nextY = Math.max(0, event.clientY - drag.startY);
    drag.currentY = nextY;
    setExitSheetDragY(nextY);
  }

  function endExitSheetDrag(event) {
    const drag = exitSheetDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (drag.currentY > 92) {
      setIsExitPromptOpen(false);
    }

    exitSheetDragRef.current = null;
    setIsExitSheetDragging(false);
    setExitSheetDragY(0);
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
          <article
            className={`focus-playlist-card ${activePlaylist === index ? "is-active" : ""}`}
            key={playlist.title}
            onClick={() => playPlaylist(playlist, index)}
          >
            <span className="playlist-status">{activePlaylist === index ? "En boucle" : "Playlist"}</span>
            <span className="playlist-copy">
              <strong>{playlist.title}</strong>
              <span>{playlist.subtitle}</span>
            </span>
            <button
              className="playlist-start"
              type="button"
              aria-label={`Démarrer ${playlist.title}`}
              onClick={(event) => {
                event.stopPropagation();
                startTimer(index);
              }}
            >
              <PlayIcon width={14} height={14} />
            </button>
          </article>
        ))}
      </div>

      <div className="focus-category-list" aria-label="Catégories focus">
        <span>Working</span>
        <span>Motivation</span>
        <span>Deep work</span>
      </div>

      <div className="focus-bottom-fade" aria-hidden="true" />

      {isRunning && (
        <div className="focus-session-overlay" role="dialog" aria-label="Session focus en cours" onClick={() => setSessionControlsVisible(true)}>
          <div className="focus-session-panel">
            {areSessionControlsVisible && (
            <button className="focus-session-close" type="button" onClick={() => setIsExitPromptOpen(true)} aria-label="Quitter la session">
              <XMarkIcon width={28} height={28} />
            </button>
            )}
            <div className="focus-session-title">Prends l'air</div>
            <div className="focus-session-clock" aria-live="polite">
              {sessionDisplayValue}
            </div>

            {isExitPromptOpen && (
              <div
                className={`early-exit-sheet ${isExitSheetDragging ? "is-dragging" : ""}`}
                role="alertdialog"
                aria-label="Partir tôt"
                style={{ "--exit-sheet-y": `${exitSheetDragY}px` }}
                onPointerDown={startExitSheetDrag}
                onPointerMove={moveExitSheetDrag}
                onPointerUp={endExitSheetDrag}
                onPointerCancel={endExitSheetDrag}
              >
                <div className="early-exit-handle" aria-hidden="true" />
                <div className="early-exit-icon" aria-hidden="true">
                  <XMarkIcon width={32} height={32} />
                </div>
                <h2>Partir tôt ?</h2>
                <p>N'abandonne pas, tu as commencé pour une raison.</p>
              <button
                className={`early-exit-hold ${isExitHolding ? "is-holding" : ""} ${isExitValidated ? "is-validated" : ""}`}
                type="button"
                onPointerDown={startExitHold}
                onPointerUp={cancelExitHold}
                  onPointerCancel={cancelExitHold}
                onPointerLeave={cancelExitHold}
              >
                {isExitValidated && <CheckIcon width={16} height={16} />}
                <span>{isExitValidated ? "Terminer" : isExitHolding ? "Maintenez appuyé..." : "Maintiens pour partir"}</span>
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
