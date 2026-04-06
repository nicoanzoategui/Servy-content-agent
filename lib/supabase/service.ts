import { createClient } from "@supabase/supabase-js";

/**
 * Solo en Route Handlers / Server Actions.
 * Bypass RLS — requiere SUPABASE_SERVICE_ROLE_KEY en el servidor.
 *
 * Sin genérico `Database`: la forma manual de `Database` no cumple aún el
 * `GenericSchema` completo de @supabase/supabase-js (p. ej. `.update()` → `never`).
 * Regenerá tipos con `supabase gen types` y volvé a tipar el cliente.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
