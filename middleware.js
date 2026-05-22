// Edge Middleware: inyecta metas Open Graph dinamicas SOLO para crawlers
// (WhatsApp, Telegram, Twitter, Facebook, Slack, LinkedIn, Discord, iMessage).
// Para usuarios normales, deja pasar la SPA React sin tocar nada.

export const config = {
  matcher: ["/formulario/:path*"],
};

const CRAWLER_RE = /facebookexternalhit|facebot|whatsapp|telegrambot|twitterbot|linkedinbot|slackbot|discordbot|googlebot|bingbot|applebot|skypeuripreview|pinterest|redditbot|tumblr|w3c_validator|embedly|outbrain|nuzzel|bitlybot|vkshare|qwantify|yandexbot|chatwork/i;

export default async function middleware(req) {
  const ua = req.headers.get("user-agent") || "";

  // Si NO es crawler, dejar pasar al index.html normal
  if (!CRAWLER_RE.test(ua)) {
    return;
  }

  // Es crawler: extraer link_id de la URL
  const url = new URL(req.url);
  const linkId = url.pathname.replace(/^\/formulario\//, "").split("/")[0] || "";

  const title = "Solicitud de Briefing - Habitaris";
  const description = "Cu\u00e9ntanos sobre tu proyecto de arquitectura, interiorismo o dise\u00f1o. Habitaris.";
  const imageUrl = "https://suite.habitaris.es/logo-habitaris-blanco.jpg";
  const canonicalUrl = "https://suite.habitaris.es/formulario/" + linkId;

  const html = '<!doctype html><html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>' + title + '</title><meta name="description" content="' + description + '"/><link rel="canonical" href="' + canonicalUrl + '"/><meta property="og:title" content="' + title + '"/><meta property="og:description" content="' + description + '"/><meta property="og:type" content="website"/><meta property="og:url" content="' + canonicalUrl + '"/><meta property="og:image" content="' + imageUrl + '"/><meta property="og:image:secure_url" content="' + imageUrl + '"/><meta property="og:image:type" content="image/jpeg"/><meta property="og:image:width" content="812"/><meta property="og:image:height" content="224"/><meta property="og:image:alt" content="Habitaris"/><meta property="og:site_name" content="Habitaris"/><meta property="og:locale" content="es_CO"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="' + title + '"/><meta name="twitter:description" content="' + description + '"/><meta name="twitter:image" content="' + imageUrl + '"/><meta name="theme-color" content="#111111"/></head><body><h1>' + title + '</h1><p>' + description + '</p></body></html>';

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, s-maxage=0, max-age=0",
    },
  });
}
