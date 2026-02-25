/**
 * core/supabase.js — Conexión única a Supabase para toda la suite
 * NO importar createClient en ningún otro archivo. Solo aquí.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://xlzkasdskatnikuavefh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rza2F0bmlrdWF2ZWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTE3NzQsImV4cCI6MjA4NzQ2Nzc3NH0.SR9tIpvL0YnV9CNrRq4T-xetifuNQOJZE0OnQpwtYLM";

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
export { SUPABASE_URL, SUPABASE_KEY };
