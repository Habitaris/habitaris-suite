/**
 * core/supabase.js — Conexión única a Supabase para toda la suite
 * NO importar createClient en ningún otro archivo. Solo aquí.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://xlzkasdskatnikuavefh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rzc2thdG5pa3VhdmVmaCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzQwMTUyOTk3LCJleHAiOjIwNTU3Mjg5OTd9.DP5x1hNbnTSzIFRMFOG7tYbykaAJMc6BRXYC_dFNFgE";

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
export { SUPABASE_URL, SUPABASE_KEY };
