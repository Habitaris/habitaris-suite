import crypto from "crypto";

const JAAS_APP_ID = "vpaas-magic-cookie-3cfaa45d1fd143f4818e2959871dfb07";
const JAAS_KID = "vpaas-magic-cookie-3cfaa45d1fd143f4818e2959871dfb07/9ac98a";

function base64url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { room, userName, userEmail, isModerator } = req.body || {};
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 7200; // 2 hours

    const header = { kid: JAAS_KID, typ: "JWT", alg: "RS256" };
    const payload = {
      aud: "jitsi",
      iss: "chat",
      iat: now,
      exp: exp,
      nbf: now - 5,
      sub: JAAS_APP_ID,
      context: {
        features: {
          livestreaming: true,
          "file-upload": true,
          "outbound-call": false,
          "sip-outbound-call": false,
          transcription: true,
          "list-visitors": false,
          recording: true,
          flip: false,
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

    const pk = process.env.JAAS_PRIVATE_KEY.replace(/\\n/g, "\n");
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(signingInput);
    const signature = base64url(sign.sign(pk));

    const jwt = signingInput + "." + signature;
    res.status(200).json({ token: jwt });
  } catch (err) {
    console.error("JaaS token error:", err);
    res.status(500).json({ error: err.message });
  }
}
