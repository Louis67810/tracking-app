import { useEffect, useState } from "react";
import { recordScanEvent } from "../lib/events.js";

export default function ScanPage() {
  const [status, setStatus] = useState("Lecture du tag...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tag = params.get("tag");

    if (!tag) {
      setStatus("Tag manquant");
      return;
    }

    recordScanEvent(tag, Object.fromEntries(params.entries()))
      .then(() => setStatus("Événement enregistré"))
      .catch(() => setStatus("Supabase n'est pas encore configuré"));
  }, []);

  return (
    <section className="scan-page page-surface">
      <p>{status}</p>
    </section>
  );
}
