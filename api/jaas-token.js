import crypto from "crypto";

const JAAS_APP_ID = "vpaas-magic-cookie-3cfaa45d1fd143f4818e2959871dfb07";
const JAAS_KID = "vpaas-magic-cookie-3cfaa45d1fd143f4818e2959871dfb07/9ac98a";

function base64url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function getPrivateKey() {
  let raw = process.env.JAAS_PRIVATE_KEY || "";
  // Handle all newline formats
  if (raw.includes("\\n")) raw = raw.split("\\n").join("\n");
  raw = raw.trim();
  return raw;
}

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { room, userName, userEmail, isModerator } = req.body || {};
    const now = Math.floor(Date.now() / 1000);

    const header = { kid: JAAS_KID, typ: "JWT", alg: "RS256" };
    const payload = {
      aud: "jitsi",
      iss: "chat",
      iat: now,
      exp: now + 7200,
      nbf: now - 5,
      sub: JAAS_APP_ID,
      context: {
        features: {
          livestreaming: true,
          "file-upload": true,
          "outbound-call": false,
          "sip-outbound-call": false,
          transcription: true,
          recording: true,
        },
        user: {
          "hidden-from-recorder": false,
          moderator: isModerator !== false,
          name: userName || "Habitaris",
          id: userEmail || "comercial@habitaris.co",
          avatar: "",
          email: userEmail || "comercial@habitaris.co",
        },
      },
      room: room || "*",
    };

    const headerB64 = base64url(Buffer.from(JSON.stringify(header)));
    const payloadB64 = base64url(Buffer.from(JSON.stringify(payload)));
    const signingInput = headerB64 + "." + payloadB64;

    const pk = getPrivateKey();
    if (!pk.includes("-----BEGIN")) {
      console.error("JAAS_PRIVATE_KEY invalid. Length:", pk.length, "Start:", pk.substring(0, 30));
      return res.status(500).json({ error: "Invalid private key format" });
    }

    const sign = crypto.createSign("RSA-SHA256");
    sign.update(signingInput);
    const signature = base64url(sign.sign(pk));

    res.status(200).json({ token: signingInput + "." + signature });
  } catch (err) {
    console.error("JaaS token error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
