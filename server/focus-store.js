import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";

export function database() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw Object.assign(
      new Error("Le serveur de sauvegarde n’est pas encore configuré."),
      { status: 503 },
    );
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export function check(error) {
  if (error)
    throw Object.assign(
      new Error(
        "La sauvegarde est indisponible. Aucune autorisation n’a été délivrée.",
      ),
      { status: 503 },
    );
}
export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}
export function newToken() {
  return randomBytes(32).toString("base64url");
}
export async function authenticated(
  db,
  req,
  allowedEmails = process.env.FOCUS_ALLOWED_EMAILS,
) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!token)
    throw Object.assign(new Error("Connecte-toi pour utiliser le coach."), {
      status: 401,
    });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user)
    throw Object.assign(new Error("Session expirée. Reconnecte-toi."), {
      status: 401,
    });
  const allowed = (allowedEmails || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  if (!allowed.includes(data.user.email?.toLowerCase()))
    throw Object.assign(
      new Error(
        "Ce compte n’est pas autorisé sur cette application personnelle.",
      ),
      { status: 403 },
    );
  return data.user;
}
export async function readDay(db, userId, date) {
  const { data, error } = await db
    .from("focus_coach_days")
    .select("*")
    .eq("user_id", userId)
    .eq("day_date", date)
    .maybeSingle();
  check(error);
  return data;
}
export async function updateDay(db, row, state) {
  const { data, error } = await db
    .from("focus_coach_days")
    .update({ state, version: row.version + 1 })
    .eq("id", row.id)
    .eq("version", row.version)
    .select()
    .maybeSingle();
  check(error);
  if (!data)
    throw Object.assign(
      new Error("Une autre demande est en cours. Actualise la journée."),
      { status: 409 },
    );
  return data;
}
