import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SB_URL  = "https://xlzkasdskatnikuavefh.supabase.co";
const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rza2F0bmlrdWF2ZWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0MTkxNTMsImV4cCI6MjA1NTk5NTE1M30.kNYsPMsRB0GaxrF1VDqIMeGmxD_K43zQXJIFMn1KlHk";

const sb = createClient(SB_URL, SB_ANON);

function genToken() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let t = "";
  for (let i = 0; i < 24; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
}

export async function createPortal(offerId, offerData, revision, parentToken = null) {
  const token = genToken();
  let revNum = 1;
  if (parentToken) {
    const { data: parent } = await sb.from("offer_portals").select("revision_number").eq("token", parentToken).single();
    if (parent) revNum = (parent.revision_number || 1) + 1;
  }
  const { data, error } = await sb.from("offer_portals").insert({
    token, offer_id: offerId, revision: revision || "Rev." + String(revNum).padStart(2,"0"),
    offer_data: offerData, status: "pendiente", parent_token: parentToken || null, revision_number: revNum,
  }).select().single();
  if (error) { console.error("createPortal:", error); throw error; }
  return { ...data, portalUrl: window.location.origin + "/portal#" + token };
}

export async function getPortal(token) {
  const { data, error } = await sb.from("offer_portals").select("*").eq("token", token).single();
  if (error) return null;
  return data;
}

export async function respondPortal(token, status, comments = "") {
  const { data, error } = await sb.from("offer_portals").update({
    status, client_comments: comments, client_responded_at: new Date().toISOString(),
  }).eq("token", token).select().single();
  if (error) { console.error("respondPortal:", error); throw error; }
  return data;
}

export async function getPortalsByOffer(offerId) {
  const { data } = await sb.from("offer_portals").select("*").eq("offer_id", offerId).order("created_at", { ascending: true });
  return data || [];
}

export async function getLatestPortal(offerId) {
  const { data } = await sb.from("offer_portals").select("*").eq("offer_id", offerId).order("created_at", { ascending: false }).limit(1).single();
  return data || null;
}
