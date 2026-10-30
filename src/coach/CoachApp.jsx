import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowPathIcon,
  CheckIcon,
  CheckCircleIcon,
  ClockIcon,
  Cog6ToothIcon,
  LinkIcon,
  LockClosedIcon,
  PlusIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Squares2X2Icon,
  TrashIcon,
  XMarkIcon,
  PaperClipIcon,
  ChatBubbleLeftRightIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "../lib/supabase.js";
import {
  authorization,
  dayKey,
  makeDay,
  LIMITS,
} from "../../server/focus-policy.js";
import { coachApi, readImage, readLocal, writeLocal } from "./client.js";
import "./coach.css";

const draftKey = "focus-coach-draft-v1";
const demoKey = "focus-coach-demo-v1";
const tabs = [
  ["day", "Ma journée", Squares2X2Icon],
  ["chat", "Mon coach", ChatBubbleLeftRightIcon],
  ["rules", "Les règles", ShieldCheckIcon],
  ["bridge", "Connexion", LinkIcon],
];
const starters = [
  {
    title: "Terminer ma priorité du jour",
    proof: "Le document final ou une capture montrant le résultat complet.",
    minutes: 60,
  },
  {
    title: "Avancer sur mon projet",
    proof: "Le contenu produit et une explication de ce qui a été terminé.",
    minutes: 45,
  },
];
const modes = {
  chat: "Discuter",
  proof: "Envoyer une preuve",
  exception: "Un imprévu",
};
function Icon({ as: Component, ...props }) {
  return <Component width={20} height={20} aria-hidden="true" {...props} />;
}
function niceDate(date) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export default function CoachApp() {
  const [tab, setTab] = useState("day");
  const [demo, setDemo] = useState(true);
  const [draft, setDraft] = useState(() => readLocal(draftKey, starters));
  const [day, setDay] = useState(() => readLocal(demoKey, null));
  const [session, setSession] = useState(null);
  const [health, setHealth] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(new Date());
  const [confirm, setConfirm] = useState(false);
  const [token, setToken] = useState(null);
  const [checked, setChecked] = useState(null);
  const [bridgeSteps, setBridgeSteps] = useState(() =>
    readLocal("focus-bridge-checklist", []),
  );
  const dialogRef = useRef(null);

  useEffect(() => {
    document.body.classList.add("coach-open");
    return () => document.body.classList.remove("coach-open");
  }, []);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/coach", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active) setHealth(d);
      })
      .catch(() => {});
    if (!supabase)
      return () => {
        active = false;
      };
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, value) => {
      setSession(value);
      setToken(null);
      setChecked(null);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (confirm) dialogRef.current?.showModal();
  }, [confirm]);
  useEffect(() => {
    writeLocal(draftKey, draft);
  }, [draft]);
  useEffect(() => {
    if (demo && day && !writeLocal(demoKey, day))
      setNotice("La sauvegarde locale est indisponible sur ce navigateur.");
  }, [day, demo]);
  const current = day?.date === dayKey(now, day?.timeZone) ? day : null;
  const access = authorization(current, now);
  const approved = current?.tasks.filter((t) => t.approved).length || 0;
  const tasks = current?.tasks || draft;
  const total = tasks.reduce((sum, task) => sum + task.minutes, 0);
  const ready = health?.database && health?.ai && health?.account && !!supabase;

  async function run(fn) {
    setBusy(true);
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setNotice(e.message || "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }
  async function switchMode(nextDemo) {
    await run(async () => {
      if (nextDemo) {
        setDay(readLocal(demoKey, null));
        setDemo(true);
      } else {
        if (!session) {
          setTab("bridge");
          setNotice("Connecte ton compte avant de passer au mode connecté.");
          return;
        }
        const result = await coachApi("load");
        setDay(result.day);
        setDemo(false);
      }
      setToken(null);
      setChecked(null);
    });
  }
  function updateTask(i, field, value) {
    setDraft((list) =>
      list.map((task, index) =>
        index === i ? { ...task, [field]: value } : task,
      ),
    );
  }
  async function start() {
    await run(async () => {
      const plan = {
        tasks: draft.map((task) => ({
          ...task,
          minutes: Number(task.minutes),
        })),
      };
      if (demo) setDay(makeDay(plan));
      else setDay((await coachApi("start", { plan })).day);
      setConfirm(false);
      setNotice(
        "Contrat verrouillé. Tu peux maintenant te concentrer sur ta première tâche.",
      );
    });
  }
  function demoApprove(id) {
    setDay((previous) => ({
      ...previous,
      tasks: previous.tasks.map((t) =>
        t.id === id ? { ...t, approved: true } : t,
      ),
      events: [
        ...previous.events,
        {
          at: new Date().toISOString(),
          type: "proof",
          text: "Simulation de validation d’une preuve.",
        },
      ],
    }));
    setNotice(
      "Validation simulée. Aucune application de ton iPhone n’a été débloquée.",
    );
  }
  const goProof = (taskId) => {
    setTab("chat");
    setSelectedProof(taskId);
    setChatKind("proof");
  };
  const [selectedProof, setSelectedProof] = useState("");
  const [chatKind, setChatKind] = useState("chat");

  return (
    <div className="fc-app">
      <aside className="fc-sidebar">
        <a href="/coach" className="fc-brand">
          <span className="fc-brand-mark">
            <Icon as={SparklesIcon} />
          </span>{" "}
          focus<span className="fc-brand-period">.</span>
        </a>
        <p className="fc-sidebar-caption">UN PEU DE CADRE. PLUS DE LIBERTÉ.</p>
        <nav aria-label="Navigation du coach">
          {tabs.map(([id, label, icon]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              <Icon as={icon} />
              <span>{label}</span>
              {id === "bridge" && <span className="fc-dot" />}
            </button>
          ))}
        </nav>
        <div className="fc-sidebar-bottom">
          <div className="fc-coach-mini">
            <span className="fc-avatar">✳</span>
            <div>
              <strong>Ton allié, pas ton excuse.</strong>
              <small>Un coach ferme et bienveillant.</small>
            </div>
          </div>
          <Link to="/accueil">
            <Icon as={ArrowLeftIcon} /> Retour à Tracking
          </Link>
        </div>
      </aside>
      <main className="fc-main">
        <header className="fc-topbar">
          <span className="fc-breadcrumb">
            Mon espace <span>/</span> {tabs.find((t) => t[0] === tab)[1]}
          </span>
          <div className="fc-mode">
            {!demo && (
              <button
                aria-label="Actualiser la journée"
                disabled={busy}
                onClick={() =>
                  run(async () => setDay((await coachApi("load")).day))
                }
              >
                <ArrowPathIcon width={13} height={13} />
              </button>
            )}
            <span className={demo ? "fc-status-dot demo" : "fc-status-dot"} />
            {demo ? "Mode démo" : "Mode connecté"}
            <button disabled={busy} onClick={() => switchMode(!demo)}>
              {demo ? "Connecter" : "Voir la démo"}
            </button>
          </div>
        </header>
        <div className="fc-mobile-brand">
          focus<span>.</span>
          <small>Une chose à la fois.</small>
        </div>
        <div className="fc-content">
          {notice && (
            <div className="fc-notice" role="status">
              <span>{notice}</span>
              <button
                aria-label="Fermer le message"
                onClick={() => setNotice("")}
              >
                <Icon as={XMarkIcon} />
              </button>
            </div>
          )}
          {demo && (
            <div className="fc-demo-note">
              <span>ESPACE D’ESSAI</span> Explore ton coach. Claude et le
              blocage iPhone ne sont pas actifs.
            </div>
          )}
          {tab === "day" && (
            <>
              <div className="fc-page-heading">
                <div>
                  <p className="fc-eyebrow">{niceDate(now)}</p>
                  <h1>
                    Une chose à la fois<span>.</span>
                  </h1>
                  <p>Fais de la place à ce qui compte. Le reste attendra.</p>
                </div>
                <span className="fc-day-tag">
                  <span />{" "}
                  {current ? "Journée en cours" : "À ton rythme, avec un cadre"}
                </span>
              </div>
              <section
                className={`fc-hero ${access.reason === "completed" ? "is-complete" : ""}`}
                aria-label="État de la journée"
              >
                <div className="fc-hero-text">
                  <span className="fc-pill">
                    <Icon
                      as={access.allowed ? CheckCircleIcon : LockClosedIcon}
                    />
                    {access.reason === "completed"
                      ? "OBJECTIF ATTEINT"
                      : access.reason === "exception"
                        ? "EXCEPTION TEMPORAIRE"
                        : "TON ATTENTION A DE LA VALEUR"}
                  </span>
                  <h2>
                    {access.reason === "completed" ? (
                      <>
                        Le travail est fait.
                        <br />
                        Profite de ta soirée.
                      </>
                    ) : access.reason === "exception" ? (
                      <>
                        Un imprévu, ça arrive.
                        <br />
                        Garde le cap.
                      </>
                    ) : (
                      <>
                        Le divertissement
                        <br />
                        peut patienter.
                      </>
                    )}
                  </h2>
                  <p>
                    {access.reason === "completed"
                      ? "Toutes tes preuves ont été validées. L’autorisation du jour est disponible."
                      : "Un contrat clair le matin. Des preuves à la fin. Et un coach pour garder le cap entre les deux."}
                  </p>
                  <div className="fc-hero-footer">
                    <span>
                      <Icon as={ShieldCheckIcon} />{" "}
                      {demo
                        ? "Simulation · aucun blocage réel"
                        : "Décisions vérifiées côté serveur"}
                    </span>
                    <button onClick={() => setTab("bridge")}>
                      Configurer la passerelle <Icon as={ArrowRightIcon} />
                    </button>
                  </div>
                </div>
                <div className="fc-orbit" aria-hidden="true">
                  <div className="fc-orbit-ring ring-one" />
                  <div className="fc-orbit-ring ring-two" />
                  <span className="fc-orbit-label label-one">
                    Moins de bruit
                  </span>
                  <span className="fc-orbit-label label-two">
                    Plus de présence
                  </span>
                  <span className="fc-orbit-lock">
                    <Icon
                      as={
                        access.reason === "completed"
                          ? CheckIcon
                          : LockClosedIcon
                      }
                      width={49}
                      height={49}
                    />
                  </span>
                  <i />
                  <b />
                </div>
              </section>
              <div className="fc-summary">
                <div>
                  <span>Ton engagement</span>
                  <strong>
                    {tasks.length}{" "}
                    <small>priorité{tasks.length > 1 ? "s" : ""}</small>
                  </strong>
                </div>
                <div>
                  <span>Du temps pour avancer</span>
                  <strong>
                    {Math.floor(total / 60)
                      ? `${Math.floor(total / 60)} h `
                      : ""}
                    {total % 60 ? `${total % 60} min` : ""}
                  </strong>
                </div>
                <div>
                  <span>Preuves validées</span>
                  <strong>
                    {approved}
                    <small> / {current?.tasks.length || tasks.length}</small>
                  </strong>
                </div>
                <div>
                  <span>Exceptions restantes</span>
                  <strong>
                    {LIMITS.exceptions - (current?.exceptionsUsed || 0)}
                    <small> × 15 min max.</small>
                  </strong>
                </div>
              </div>
              <div className="fc-day-grid">
                <section className="fc-plan">
                  <div className="fc-section-heading">
                    <div>
                      <h2>
                        {current
                          ? "Le contrat du jour"
                          : "Tes priorités du jour"}
                      </h2>
                      <p>
                        {current
                          ? "Le contrat est verrouillé. Chaque résultat mérite sa preuve."
                          : "Peu de tâches. Un résultat précis pour chacune."}
                      </p>
                    </div>
                    <span className="fc-count">
                      {tasks.length.toString().padStart(2, "0")}
                    </span>
                  </div>
                  {!current && (
                    <div className="fc-hint">
                      Les exemples ci-dessous sont à adapter à ton vrai travail.
                    </div>
                  )}
                  <div className="fc-task-list">
                    {tasks.map((task, i) => (
                      <article
                        className={`fc-task ${task.approved ? "approved" : ""}`}
                        key={task.id || i}
                      >
                        <div className="fc-task-number">
                          {task.approved ? (
                            <Icon as={CheckIcon} />
                          ) : (
                            String(i + 1).padStart(2, "0")
                          )}
                        </div>
                        <div className="fc-task-body">
                          {current ? (
                            <>
                              <div className="fc-task-title">
                                <h3>{task.title}</h3>
                                <span>{task.minutes} min</span>
                              </div>
                              <p className="fc-proof-label">PREUVE ATTENDUE</p>
                              <p>{task.proof}</p>
                              <div className="fc-task-bottom">
                                {task.approved ? (
                                  <span className="fc-validated">
                                    <Icon as={CheckCircleIcon} />
                                    Preuve validée
                                  </span>
                                ) : (
                                  <button
                                    className="fc-text-button"
                                    onClick={() => goProof(task.id)}
                                  >
                                    Envoyer ma preuve{" "}
                                    <Icon as={ArrowRightIcon} />
                                  </button>
                                )}
                                {demo && !task.approved && (
                                  <button
                                    className="fc-simulate"
                                    onClick={() => demoApprove(task.id)}
                                  >
                                    Simuler la validation
                                  </button>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <label
                                className="fc-sr-only"
                                htmlFor={`task-${i}`}
                              >
                                Priorité {i + 1}
                              </label>
                              <input
                                id={`task-${i}`}
                                maxLength={160}
                                value={task.title}
                                onChange={(e) =>
                                  updateTask(i, "title", e.target.value)
                                }
                                placeholder="Quel résultat veux-tu obtenir ?"
                              />
                              <label
                                className="fc-proof-label"
                                htmlFor={`proof-${i}`}
                              >
                                COMMENT LE PROUVER ?
                              </label>
                              <textarea
                                id={`proof-${i}`}
                                maxLength={600}
                                rows={2}
                                value={task.proof}
                                onChange={(e) =>
                                  updateTask(i, "proof", e.target.value)
                                }
                                placeholder="Décris une preuve vérifiable, pas juste ‘c’est fini’."
                              />
                              <div className="fc-task-bottom">
                                <label className="fc-duration">
                                  <Icon as={ClockIcon} />
                                  <input
                                    aria-label={`Durée de la priorité ${i + 1}`}
                                    type="number"
                                    min={5}
                                    max={240}
                                    step={5}
                                    value={task.minutes}
                                    onChange={(e) =>
                                      updateTask(i, "minutes", e.target.value)
                                    }
                                  />{" "}
                                  min
                                </label>
                                <button
                                  aria-label={`Supprimer la priorité ${i + 1}`}
                                  disabled={draft.length === 1}
                                  className="fc-icon-button"
                                  onClick={() =>
                                    setDraft((list) =>
                                      list.filter((_, index) => index !== i),
                                    )
                                  }
                                >
                                  <Icon as={TrashIcon} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                  {!current && (
                    <>
                      <button
                        className="fc-add-task"
                        disabled={draft.length >= 8}
                        onClick={() =>
                          setDraft((list) => [
                            ...list,
                            { title: "", proof: "", minutes: 30 },
                          ])
                        }
                      >
                        <Icon as={PlusIcon} /> Ajouter une priorité{" "}
                        <span>{draft.length}/8</span>
                      </button>
                      <button
                        className="fc-primary fc-start"
                        onClick={() => setConfirm(true)}
                        disabled={
                          busy ||
                          !draft.length ||
                          draft.some(
                            (t) =>
                              t.title.trim().length < 3 ||
                              t.proof.trim().length < 10 ||
                              Number(t.minutes) < 5 ||
                              Number(t.minutes) > 240,
                          )
                        }
                      >
                        <Icon as={LockClosedIcon} /> Verrouiller ma journée{" "}
                        <Icon as={ArrowRightIcon} />
                      </button>
                      <p className="fc-footnote">
                        Tes objectifs ne pourront plus être retirés après le
                        lancement.
                      </p>
                    </>
                  )}
                  {current && (
                    <div className="fc-day-decision">
                      <Icon
                        as={access.allowed ? CheckCircleIcon : LockClosedIcon}
                      />
                      <div>
                        <strong>
                          {access.reason === "completed"
                            ? "Journée validée"
                            : access.reason === "exception"
                              ? "Exception accordée"
                              : "Autorisation fermée"}
                        </strong>
                        <p>
                          {access.expiresAt
                            ? `Valable jusqu’à ${new Date(access.expiresAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}.`
                            : `${current.tasks.length - approved} preuve(s) à faire valider.`}{" "}
                          {demo
                            ? "État simulé."
                            : "Le raccourci doit lire cet état."}
                        </p>
                      </div>
                    </div>
                  )}
                </section>
                <aside className="fc-right-column">
                  <section className="fc-coach-card">
                    <span className="fc-avatar large">✳</span>
                    <span className="fc-eyebrow">LE BON ALLIÉ</span>
                    <h2>
                      Un cadre ferme.
                      <br />
                      Un peu d’humanité.
                    </h2>
                    <p>
                      Un imprévu ? Une tâche qui coince ? On en parle. Une envie
                      de scroller ? Elle peut attendre.
                    </p>
                    <button
                      onClick={() => {
                        setTab("chat");
                        setChatKind("chat");
                      }}
                    >
                      Parler à mon coach <Icon as={ArrowRightIcon} />
                    </button>
                    <small>
                      <span className="fc-status-dot" />
                      {demo
                        ? "Aperçu du coach · sans IA"
                        : ready
                          ? "Claude configuré"
                          : "Claude à connecter"}
                    </small>
                  </section>
                  <section className="fc-how">
                    <h3>Le pacte est simple.</h3>
                    {[
                      [
                        "01",
                        "Tu choisis ce qui compte.",
                        "Des tâches précises et réalistes.",
                      ],
                      [
                        "02",
                        "Tu fais, tu montres.",
                        "Le coach examine tes preuves.",
                      ],
                      [
                        "03",
                        "Tu profites, l’esprit libre.",
                        "Les loisirs reviennent une fois validé.",
                      ],
                    ].map(([n, title, body]) => (
                      <div key={n}>
                        <span>{n}</span>
                        <div>
                          <strong>{title}</strong>
                          <p>{body}</p>
                        </div>
                      </div>
                    ))}
                  </section>
                </aside>
              </div>
              {current && <Journal day={current} />}
            </>
          )}
          {tab === "chat" && (
            <>
              <PageHeading
                eyebrow="UN ALLIÉ QUI GARDE LE CAP"
                title="On fait le point."
                subtitle="Une preuve, une question ou un vrai imprévu. Je t’écoute."
              />
              <div className="fc-chat-grid">
                <Chat
                  day={current}
                  demo={demo}
                  busy={busy}
                  run={run}
                  setDay={setDay}
                  setNotice={setNotice}
                  kind={chatKind}
                  setKind={setChatKind}
                  taskId={selectedProof}
                  setTaskId={setSelectedProof}
                />
                <aside>
                  <RuleCard />
                  <div className="fc-callout">
                    <Icon as={ShieldCheckIcon} />
                    <p>
                      Les appels, la santé et les outils essentiels doivent
                      rester accessibles. Choisis uniquement tes apps de
                      divertissement dans le bloqueur.
                    </p>
                  </div>
                </aside>
              </div>
            </>
          )}
          {tab === "rules" && (
            <>
              <PageHeading
                eyebrow="ON SE MET D’ACCORD"
                title="Ferme. Jamais injuste."
                subtitle="Ces limites sont appliquées par le serveur, même si tu demandes à Claude de les ignorer."
              />
              <div className="fc-rules-grid">
                <RuleCard />
                <section className="fc-card">
                  <h2>Ce qui compte comme preuve</h2>
                  <p>
                    Un livrable qui répond au résultat convenu : texte final,
                    exercice résolu, capture lisible d’un projet terminé.
                  </p>
                  <ul className="fc-rule-list">
                    <li>
                      <CheckCircleIcon />
                      Une tâche sélectionnée, une décision.
                    </li>
                    <li>
                      <CheckCircleIcon />
                      Une image JPG, PNG ou WebP, 2 Mo maximum.
                    </li>
                    <li>
                      <CheckCircleIcon />
                      Ou le contenu du travail, collé en texte.
                    </li>
                  </ul>
                  <p className="fc-muted">
                    « J’ai fini » et un lien seul ne suffisent pas. Claude ne
                    visite pas les liens. Une capture peut être falsifiée : ce
                    système repose aussi sur ton honnêteté.
                  </p>
                </section>
                <section className="fc-card">
                  <h2>Les limites du système</h2>
                  <p>
                    Claude propose une décision. Le serveur vérifie le contrat,
                    les preuves et les quotas avant d’enregistrer une
                    autorisation.
                  </p>
                  <p>
                    40 demandes par jour, au moins 8 secondes entre deux
                    demandes. Les objectifs restent verrouillés jusqu’au
                    changement de jour, dans le fuseau du serveur (Europe/Paris
                    par défaut).
                  </p>
                  <p>
                    Sans réponse du serveur, aucune nouvelle ouverture. Une
                    autorisation déjà accordée reste valable jusqu’à son
                    échéance.
                  </p>
                </section>
                <section className="fc-card">
                  <h2>Tu gardes la main sur ton téléphone</h2>
                  <p>
                    Ce n’est pas un verrou inviolable : tu peux désactiver une
                    automatisation ou retirer les permissions du bloqueur.
                  </p>
                  <p>
                    Le coach ne te culpabilise pas et ne décide pas si tu
                    mérites du repos. Une pause hors écran n’a pas besoin
                    d’autorisation.
                  </p>
                  <button
                    className="fc-text-button"
                    onClick={() => setTab("bridge")}
                  >
                    Voir les conditions de la passerelle{" "}
                    <Icon as={ArrowRightIcon} />
                  </button>
                </section>
              </div>
            </>
          )}
          {tab === "bridge" && (
            <>
              <PageHeading
                eyebrow="LE DERNIER MAILLON"
                title="Ton iPhone, dans la boucle."
                subtitle="Tout est prêt pour préparer la connexion. Aucune app de blocage n’est encore pilotée."
              />
              <div className="fc-bridge-grid">
                <section className="fc-card">
                  <div className="fc-section-heading">
                    <h2>1. Connecter ton coach</h2>
                    <Cog6ToothIcon width={22} />
                  </div>
                  <div className="fc-connection-list">
                    {[
                      ["Interface", true],
                      ["Compte Supabase", !!supabase],
                      ["Sauvegarde serveur", health?.database],
                      ["Claude", health?.ai],
                      ["Accès personnel", health?.account],
                    ].map(([label, ok]) => (
                      <div key={label}>
                        <span>{label}</span>
                        <span className={ok ? "fc-ok" : "fc-muted"}>
                          {ok ? "Configuré" : "À configurer"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="fc-muted">
                    Les indicateurs vérifient la présence de configuration. La
                    connexion réelle est vérifiée à la première requête.
                  </p>
                  <Login session={session} run={run} setNotice={setNotice} />
                  {session && (
                    <button
                      className="fc-primary"
                      disabled={busy || !ready}
                      onClick={() => switchMode(false)}
                    >
                      Ouvrir ma journée connectée <Icon as={ArrowRightIcon} />
                    </button>
                  )}
                  <p className="fc-footnote">
                    L’abonnement Claude ne fournit pas l’accès API. Les appels
                    au modèle ont leur propre coût.
                  </p>
                </section>
                <section className="fc-card">
                  <h2>2. Préparer la passerelle</h2>
                  <p>
                    Jomo expose des actions de démarrage et d’arrêt dans
                    Raccourcis. Leur disponibilité et leur prix restent à
                    vérifier dans ta version.
                  </p>
                  {[
                    "Installer Jomo et sélectionner seulement les apps de loisirs",
                    "Créer un modèle de blocage compatible avec Raccourcis",
                    "Tester le blocage et l’arrêt manuellement",
                  ].map((label, i) => (
                    <label className="fc-check-step" key={label}>
                      <input
                        type="checkbox"
                        checked={bridgeSteps.includes(i)}
                        onChange={() => {
                          const next = bridgeSteps.includes(i)
                            ? bridgeSteps.filter((x) => x !== i)
                            : [...bridgeSteps, i];
                          setBridgeSteps(next);
                          writeLocal("focus-bridge-checklist", next);
                        }}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                  <p className="fc-footnote">
                    Cette liste est déclarative : elle ne détecte pas les apps
                    installées sur ton iPhone.
                  </p>
                  <a
                    className="fc-text-button"
                    href="https://help.jomo.so/en/article/how-to-automate-jomo-with-shortcuts-and-siri-17p3ehp/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Guide officiel Jomo ↗
                  </a>
                </section>
                <section className="fc-card fc-device-card">
                  <h2>3. Associer le raccourci</h2>
                  <p>
                    Une clé dédiée permet seulement de lire l’autorisation. Elle
                    ne peut ni valider une tâche ni changer le contrat. Valable
                    30 jours ; une nouvelle clé remplace l’ancienne.
                  </p>
                  <div className="fc-button-row">
                    <button
                      className="fc-primary"
                      disabled={demo || !session || busy || !ready}
                      onClick={() =>
                        run(async () => {
                          setToken(await coachApi("pair"));
                          setChecked(null);
                        })
                      }
                    >
                      Créer une clé iPhone
                    </button>
                    <button
                      className="fc-secondary"
                      disabled={demo || !session || busy}
                      onClick={() =>
                        run(async () => {
                          await coachApi("revoke");
                          setToken(null);
                          setChecked(null);
                          setNotice(
                            "Clé révoquée. Les nouvelles lectures seront refusées.",
                          );
                        })
                      }
                    >
                      Révoquer la clé
                    </button>
                  </div>
                  {demo && (
                    <p className="fc-footnote">
                      Les clés sont désactivées en démo. Elles ne sont jamais
                      stockées dans l’historique local.
                    </p>
                  )}
                  {token && (
                    <div className="fc-token">
                      <strong>Clé affichée uniquement ici</strong>
                      <code>{token.token}</code>
                      <button
                        onClick={() =>
                          run(async () => {
                            await navigator.clipboard.writeText(token.token);
                            setNotice(
                              "Clé copiée. Garde-la dans ton raccourci, sans la partager.",
                            );
                          })
                        }
                      >
                        Copier la clé
                      </button>
                      <p>
                        Expire le{" "}
                        {new Date(token.expiresAt).toLocaleDateString("fr-FR")}.
                      </p>
                      <button
                        disabled={busy}
                        onClick={() =>
                          run(async () =>
                            setChecked(
                              await coachApi("device-status", {
                                token: token.token,
                              }),
                            ),
                          )
                        }
                      >
                        Tester la lecture
                      </button>
                    </div>
                  )}
                  {checked && (
                    <pre className="fc-code">
                      {JSON.stringify(checked, null, 2)}
                    </pre>
                  )}
                  <ShortcutInstructions origin={window.location.origin} />
                </section>
                <section className="fc-card">
                  <h2>Sans application de blocage</h2>
                  <p>
                    Tu peux démarrer avec Raccourcis seul. À l’ouverture d’une
                    app choisie, une automatisation vérifie la même
                    autorisation. Si elle est refusée ou si la requête échoue,
                    elle te renvoie à l’accueil.
                  </p>
                  <p>
                    Cette option ne ferme pas l’app et n’interrompt pas une app
                    déjà ouverte quand une permission expire. Elle est plus
                    facile à contourner qu’un bloqueur natif.
                  </p>
                  <div className="fc-callout">
                    <LockClosedIcon width={22} />
                    <p>
                      Le mode démo n’émet jamais de clé. Une simulation de
                      validation ne peut pas ouvrir tes apps.
                    </p>
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
        <footer className="fc-footer">
          <span>Un engagement envers toi-même.</span>
          <span>Moins de bruit. Plus de toi.</span>
        </footer>
      </main>
      <nav className="fc-mobile-nav" aria-label="Navigation mobile du coach">
        {tabs.map(([id, label, icon]) => (
          <button
            key={id}
            aria-current={tab === id ? "page" : undefined}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            <Icon as={icon} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {confirm && (
        <dialog
          ref={dialogRef}
          className="fc-dialog"
          aria-labelledby="fc-contract-title"
          onCancel={() => setConfirm(false)}
          onClose={() => setConfirm(false)}
        >
          <div className="fc-dialog-icon">
            <LockClosedIcon width={28} />
          </div>
          <h2 id="fc-contract-title">On s’engage pour aujourd’hui ?</h2>
          <p>
            {draft.length} priorité(s), {total} minutes prévues. Après le
            lancement, tu ne pourras plus supprimer les tâches ni changer leurs
            preuves attendues.
          </p>
          <p>
            {demo
              ? "Tu es en démo : le contrat et les validations restent des simulations."
              : "Le contrat sera sauvegardé sur le serveur. Le blocage iPhone doit être démarré dans Raccourcis."}
          </p>
          <div className="fc-button-row">
            <button
              className="fc-secondary"
              disabled={busy}
              onClick={() => setConfirm(false)}
            >
              Revoir mon plan
            </button>
            <button className="fc-primary" disabled={busy} onClick={start}>
              {busy ? "Enregistrement…" : "Je m’engage"}
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}

function PageHeading({ eyebrow, title, subtitle }) {
  return (
    <div className="fc-page-heading">
      <div>
        <p className="fc-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}
function RuleCard() {
  return (
    <section className="fc-card fc-rule-card">
      <div className="fc-section-heading">
        <h2>Les règles du pacte</h2>
        <ShieldCheckIcon width={23} />
      </div>
      <ul className="fc-rule-list">
        <li>
          <LockClosedIcon />
          <span>Les objectifs sont verrouillés au lancement.</span>
        </li>
        <li>
          <PaperClipIcon />
          <span>Une preuve examinée pour chaque tâche.</span>
        </li>
        <li>
          <ClockIcon />
          <span>
            2 exceptions par jour, 15 minutes maximum chacune. Aucun cumul.
          </span>
        </li>
        <li>
          <CheckCircleIcon />
          <span>Toutes les tâches validées = journée terminée.</span>
        </li>
      </ul>
      <div className="fc-rule-quote">
        « Strict sur le contrat.
        <br />
        Bienveillant avec la personne. »
      </div>
    </section>
  );
}
function Journal({ day }) {
  return (
    <section className="fc-card fc-journal">
      <div className="fc-section-heading">
        <h2>Le fil de ta journée</h2>
        <span className="fc-muted">{day.events.length} événement(s)</span>
      </div>
      {day.events.map((event, i) => (
        <div key={i}>
          <time>
            {new Date(event.at).toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
          <span className="fc-journal-dot" />
          <p>{event.text}</p>
        </div>
      ))}
    </section>
  );
}

function Chat({
  day,
  demo,
  busy,
  run,
  setDay,
  setNotice,
  kind,
  setKind,
  taskId,
  setTaskId,
}) {
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [fileName, setFileName] = useState("");
  const bottom = useRef(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [day?.messages.length]);
  async function send(e) {
    e.preventDefault();
    if (!day) {
      setNotice("Commence par préparer et verrouiller ta journée.");
      return;
    }
    await run(async () => {
      if (demo) {
        const answer =
          kind === "proof"
            ? "Aperçu : en mode connecté, Claude examinera cette preuve en fonction du résultat attendu. Ici, aucune IA n’est appelée. Tu peux simuler une validation depuis Ma journée."
            : kind === "exception"
              ? "Aperçu : Claude demandera le contexte et vérifiera le quota avant de proposer une exception. La démo n’accorde pas de permission iPhone."
              : "Aperçu : commence par une action simple sur ta première priorité. Dans le mode connecté, tu pourras discuter avec Claude ici.";
        setDay((previous) => ({
          ...previous,
          messages: [
            ...previous.messages,
            { role: "user", text, attachment: !!image },
            { role: "assistant", text: answer },
          ],
        }));
      } else {
        const result = await coachApi("review", {
          kind,
          text,
          taskId: taskId || undefined,
          image: image || undefined,
        });
        setDay(result.day);
      }
      setText("");
      setImage(null);
      setFileName("");
    });
  }
  return (
    <section className="fc-chat-card">
      <div className="fc-chat-header">
        <span className="fc-avatar">✳</span>
        <div>
          <strong>Ton coach</strong>
          <small>
            {demo
              ? "Aperçu guidé · pas de Claude actif"
              : "Claude · décisions vérifiées par le serveur"}
          </small>
        </div>
        <span className="fc-chat-label">
          {day ? "CONTRAT ACTIF" : "À PRÉPARER"}
        </span>
      </div>
      <div className="fc-chat-access" role="status">
        <LockClosedIcon width={14} height={14} />
        {demo ? "État simulé" : "État du serveur"} :{" "}
        {authorization(day).reason === "completed"
          ? "journée validée"
          : authorization(day).reason === "exception"
            ? "exception temporaire accordée"
            : "autorisation fermée"}
      </div>
      <div className="fc-messages" aria-live="polite" aria-relevant="additions">
        <div className="fc-message assistant">
          <span className="fc-message-author">
            {demo ? "APERÇU DU COACH" : "BIENVENUE"}
          </span>
          <p>
            On avance une priorité à la fois. Envoie le résultat de ton travail,
            ou explique ce qui te bloque. Tes objectifs restent le point de
            repère.
          </p>
        </div>
        {day?.messages.map((message, i) => (
          <div className={`fc-message ${message.role}`} key={i}>
            <span className="fc-message-author">
              {message.role === "user"
                ? "TOI"
                : demo
                  ? "APERÇU DU COACH"
                  : "CLAUDE"}
            </span>
            <p>{message.text}</p>
            {message.attachment && (
              <small>
                ↳ Image transmise pour examen · non conservée dans l’historique
              </small>
            )}
          </div>
        ))}
        {busy && <p className="fc-thinking">Le coach examine ta demande…</p>}
        <div ref={bottom} />
      </div>
      <form className="fc-composer" onSubmit={send}>
        <div className="fc-chat-modes">
          {Object.entries(modes).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={kind === id ? "active" : ""}
              onClick={() => {
                setKind(id);
                setImage(null);
                setFileName("");
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {kind === "proof" && (
          <label className="fc-task-select">
            Preuve pour
            <select
              required
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
            >
              <option value="">Choisir une tâche</option>
              {day?.tasks
                .filter((t) => !t.approved)
                .map((t) => (
                  <option value={t.id} key={t.id}>
                    {t.title}
                  </option>
                ))}
            </select>
          </label>
        )}
        {kind === "exception" && (
          <p className="fc-exception-hint">
            Décris l’imprévu et le besoin précis.{" "}
            {LIMITS.exceptions - (day?.exceptionsUsed || 0)} exception(s)
            restante(s). La pause n’est pas automatique.
          </p>
        )}
        <label className="fc-sr-only" htmlFor="coach-message">
          Ton message
        </label>
        <textarea
          id="coach-message"
          maxLength={6000}
          rows={3}
          required
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            kind === "proof"
              ? "Colle ton travail ou explique ce que montre ta capture…"
              : kind === "exception"
                ? "Que se passe-t-il et de combien de temps as-tu besoin ?"
                : "Qu’est-ce qui te bloque ?"
          }
        />
        {image && (
          <div className="fc-attachment">
            <img src={image} alt="Aperçu de la preuve sélectionnée" />
            <span>{fileName}</span>
            <button
              type="button"
              aria-label="Retirer la pièce jointe"
              onClick={() => {
                setImage(null);
                setFileName("");
              }}
            >
              <XMarkIcon width={18} />
            </button>
          </div>
        )}
        <div className="fc-composer-bottom">
          {kind === "proof" ? (
            <label className="fc-attach-button">
              <PaperClipIcon width={18} />
              Joindre une capture
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file)
                    run(async () => {
                      setImage(await readImage(file));
                      setFileName(file.name);
                    });
                  e.target.value = "";
                }}
              />
            </label>
          ) : (
            <span>Un cadre, pas un jugement.</span>
          )}
          <button
            className="fc-send"
            aria-label="Envoyer au coach"
            disabled={
              busy || !day || !text.trim() || (kind === "proof" && !taskId)
            }
          >
            <ArrowUpIcon width={21} />
          </button>
        </div>
      </form>
      <div className="fc-chat-disclaimer">
        {!day
          ? "Verrouille ta journée pour commencer."
          : demo
            ? "Messages simulés. Aucune preuve analysée."
            : "Une réponse de Claude peut se tromper. Seul l’état d’autorisation du serveur fait foi."}
      </div>
    </section>
  );
}
function Login({ session, run, setNotice }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  if (!supabase)
    return (
      <div className="fc-callout">
        <p>
          La configuration Supabase est nécessaire pour la connexion. Tu peux
          explorer toute l’interface en démo.
        </p>
      </div>
    );
  if (session)
    return (
      <div className="fc-account">
        <span>Connecté : {session.user.email}</span>
        <button
          onClick={() =>
            run(async () => {
              const { error } = await supabase.auth.signOut();
              if (error) throw error;
              setNotice(
                "Compte déconnecté. Repasse en démo pour explorer sans compte.",
              );
            })
          }
        >
          Déconnexion
        </button>
      </div>
    );
  return (
    <form
      className="fc-login"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error)
            throw new Error(
              "Connexion refusée. Vérifie ton adresse et ton mot de passe.",
            );
          setPassword("");
          setNotice("Compte connecté. Tu peux charger ta journée.");
        });
      }}
    >
      <label>
        Adresse e-mail
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label>
        Mot de passe
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button className="fc-secondary">Me connecter</button>
      <small>
        Utilise le compte personnel autorisé dans la configuration du serveur.
      </small>
    </form>
  );
}
function ShortcutInstructions({ origin }) {
  return (
    <div className="fc-shortcuts">
      <h3>Le raccourci « Vérifier mon accès »</h3>
      <ol>
        <li>
          Ajoute <strong>Obtenir le contenu de l’URL</strong>, en méthode POST,
          avec un corps JSON.
        </li>
        <li>
          Adresse : <code>{origin}/api/coach</code>
        </li>
        <li>
          Corps :{" "}
          <code>{'{ "action": "device-status", "token": "TA_CLÉ" }'}</code>
        </li>
        <li>
          Lis <code>allowed</code>, <code>reason</code> et{" "}
          <code>expiresAt</code>. Une erreur, une réponse absente ou expirée
          signifie : rester bloqué.
        </li>
        <li>
          Si <code>reason = completed</code>, lance l’action d’arrêt du modèle
          Jomo pour la journée. Prévois une automatisation quotidienne pour
          réactiver le blocage le lendemain.
        </li>
        <li>
          Si <code>reason = exception</code>, utilise uniquement une pause à
          durée limitée avec reprise automatique, si ta version de Jomo la
          propose. Ne fais pas un arrêt illimité. Sinon, garde le blocage.
        </li>
      </ol>
      <div className="fc-callout">
        <p>
          Le site ne peut pas déclencher seul Raccourcis en arrière-plan. Tu
          lances « Vérifier mon accès » après une décision. La reprise après une
          exception doit être gérée par le bloqueur lui-même, jamais par une
          longue attente dans Raccourcis.
        </p>
      </div>
      <p className="fc-muted">
        Une protection de déploiement Vercel peut empêcher le raccourci
        d’atteindre l’API. Utilise un domaine accessible à ton iPhone ; l’API
        reste protégée par la clé dédiée.
      </p>
    </div>
  );
}
