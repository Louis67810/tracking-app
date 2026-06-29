import { supabase } from "./supabase.js";

export async function recordScanEvent(tag, value = {}) {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const { error } = await supabase.from("events").insert({
    tag,
    value
  });

  if (error) {
    throw error;
  }
}
