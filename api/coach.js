import { generateText, Output } from "ai";
import { z } from "zod";
import {
  authorization,
  applyReview,
  dayKey,
  makeDay,
  LIMITS,
  reviewSchema,
  SYSTEM_PROMPT,
} from "../server/focus-policy.js";
import {
  database,
  authenticated,
  check,
  readDay,
  updateDay,
  hashToken,
  newToken,
} from "../server/focus-store.js";

export const config = { maxDuration: 60 };
const requestSchema = z.object({
  kind: z.enum(["chat", "proof", "exception"]),
  text: z.string().trim().min(1).max(6000),
  taskId: z.string().max(100).optional(),
  image: z
    .string()
    .max(2_800_000)
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/)
    .optional(),
});
export function createCoachHandler({
  dbFactory = database,
  generate = generateText,
  env = process.env,
} = {}) {
  return async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.method === "GET")
      return res.status(200).json({
        database: !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
        ai: !!(
          env.AI_GATEWAY_MODEL?.startsWith("anthropic/") &&
          (env.AI_GATEWAY_API_KEY || env.VERCEL_OIDC_TOKEN)
        ),
        account: !!env.FOCUS_ALLOWED_EMAILS,
      });
    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return res
        .status(405)
        .json({ error: "Méthode non autorisée.", allowed: false });
    }
    try {
      const body =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (!body || JSON.stringify(body).length > 3_000_000)
        return res.status(413).json({
          error: "La pièce jointe est trop volumineuse.",
          allowed: false,
        });
      const db = dbFactory();
      const timeZone = env.FOCUS_TIMEZONE || "Europe/Paris";
      if (body.action === "device-status") {
        const token = z.string().min(40).max(100).parse(body.token);
        const { data: device, error } = await db
          .from("focus_coach_devices")
          .select("*")
          .eq("token_hash", hashToken(token))
          .maybeSingle();
        check(error);
        if (!device || Date.parse(device.expires_at) <= Date.now())
          return res
            .status(401)
            .json({
              allowed: false,
              reason: "invalid_device",
              expiresAt: null,
            });
        const row = await readDay(
          db,
          device.user_id,
          dayKey(new Date(), timeZone),
        );
        return res.status(200).json({
          ...authorization(row?.state),
          checkedAt: new Date().toISOString(),
          deviceExpiresAt: device.expires_at,
        });
      }
      const user = await authenticated(db, req, env.FOCUS_ALLOWED_EMAILS);
      const date = dayKey(new Date(), timeZone);
      if (body.action === "pair") {
        const token = newToken();
        const expiresAt = new Date(Date.now() + 30 * 86400_000).toISOString();
        const { error } = await db.from("focus_coach_devices").upsert(
          {
            user_id: user.id,
            token_hash: hashToken(token),
            expires_at: expiresAt,
          },
          { onConflict: "user_id" },
        );
        check(error);
        return res.status(200).json({ token, expiresAt });
      }
      if (body.action === "revoke") {
        const { error } = await db
          .from("focus_coach_devices")
          .delete()
          .eq("user_id", user.id);
        check(error);
        return res.status(200).json({ revoked: true });
      }
      let row = await readDay(db, user.id, date);
      if (body.action === "load")
        return res.status(200).json({ day: row?.state || null });
      if (body.action === "start") {
        if (row)
          return res
            .status(409)
            .json({ error: "Le contrat du jour est déjà verrouillé." });
        const state = makeDay(body.plan, new Date(), timeZone);
        const { error } = await db
          .from("focus_coach_days")
          .insert({ user_id: user.id, day_date: date, state });
        if (error?.code === "23505")
          return res
            .status(409)
            .json({ error: "La journée a déjà été démarrée." });
        check(error);
        return res.status(200).json({ day: state });
      }
      if (body.action !== "review")
        return res
          .status(400)
          .json({ error: "Action inconnue.", allowed: false });
      if (!row)
        return res
          .status(409)
          .json({ error: "Prépare puis démarre ta journée." });
      const input = requestSchema.parse(body);
      if (
        input.kind === "proof" &&
        !row.state.tasks.some((t) => t.id === input.taskId && !t.approved)
      )
        return res
          .status(400)
          .json({ error: "Choisis une tâche à faire valider." });
      if (
        row.state.requests >= LIMITS.requests ||
        (row.state.lastRequest &&
          Date.now() - Date.parse(row.state.lastRequest) < LIMITS.cooldownMs)
      )
        return res.status(429).json({
          error:
            "Limite du coach atteinte : 40 demandes par jour, espacées de 8 secondes.",
        });
      const model = env.AI_GATEWAY_MODEL;
      if (
        !model?.startsWith("anthropic/") ||
        !(env.AI_GATEWAY_API_KEY || env.VERCEL_OIDC_TOKEN)
      )
        return res.status(503).json({
          error: "Claude n’est pas encore connecté. Le blocage reste inchangé.",
        });
      // Reserve the request before spending tokens. The CAS also serializes overlapping decisions.
      row = await updateDay(db, row, {
        ...row.state,
        requests: row.state.requests + 1,
        lastRequest: new Date().toISOString(),
      });
      const content = [
        {
          type: "text",
          text: JSON.stringify({
            contract: row.state,
            request: {
              kind: input.kind,
              taskId: input.taskId,
              text: input.text,
            },
            limits: LIMITS,
          }),
        },
      ];
      if (input.image) content.push({ type: "image", image: input.image });
      const { output } = await generate({
        model,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content }],
        output: Output.object({ schema: reviewSchema }),
        maxOutputTokens: 1200,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(45_000),
      });
      const next = applyReview(row.state, output, {
        ...input,
        hasImage: !!input.image,
      });
      row = await updateDay(db, row, next);
      return res
        .status(200)
        .json({ day: row.state, authorization: authorization(row.state) });
    } catch (error) {
      const validation =
        error instanceof z.ZodError || error instanceof SyntaxError;
      return res.status(validation ? 400 : error.status || 503).json({
        allowed: false,
        error: validation
          ? "Vérifie les champs et le format de la preuve."
          : error.status
            ? error.message
            : "Le coach est indisponible. Aucune nouvelle autorisation délivrée. Réessaie dans un instant.",
      });
    }
  };
}
export default createCoachHandler();
