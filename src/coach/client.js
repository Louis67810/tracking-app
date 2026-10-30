import { supabase } from "../lib/supabase.js";

export async function coachApi(action, body = {}) {
  const { data } = supabase ? await supabase.auth.getSession() : { data: {} };
  const response = await fetch("/api/coach", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(data.session
        ? { Authorization: `Bearer ${data.session.access_token}` }
        : {}),
    },
    body: JSON.stringify({ action, ...body }),
  });
  const result = await response
    .json()
    .catch(() => ({
      error: "Le serveur ne répond pas. Le blocage reste inchangé.",
    }));
  if (!response.ok) throw new Error(result.error || "La demande a échoué.");
  return result;
}
export function readLocal(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}
export function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function readImage(file) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 2_000_000
  )
    throw new Error("Choisis une image JPG, PNG ou WebP de moins de 2 Mo.");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Impossible de lire cette image."));
    reader.readAsDataURL(file);
  });
}
