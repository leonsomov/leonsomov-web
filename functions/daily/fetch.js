// Cloudflare Pages Function — CORS proxy for Daily's RSS feeds.
// Locked to an allowlist of Daily's own sources so it can't be used as an open proxy.

const ALLOWED_DOMAINS = [
  // Progress
  "positive.news",
  "goodnewsnetwork.org",
  "reasonstobecheerful.world",
  // Science
  "worksinprogress.news",
  "ourworldindata.org",
  "noemamag.com",
  "construction-physics.com",
  "ageofinvention.xyz",
  "asteriskmag.com",
  "lowtechmagazine.com",
  "astralcodexten.substack.com",
  "experimental-history.com",
  "quantamagazine.org",
  "nautil.us",
  "hnrss.org",
  "producthunt.com",
  "arxiv.org",
  // Synths
  "synthtopia.com",
  "matrixsynth.com",
  "gearnews.com",
  "synthanatomy.com",
  "bedroomproducersblog.com",
  "makenoisemusic.com",
  "elektron.se",
  // DAW
  "loop.ableton.com",
  // Electronic music
  "cdm.link",
  "attackmagazine.com",
  "xlr8r.com",
  "theransomnote.com",
  "invertedaudio.com",
  "thewire.co.uk",
  "bandcamp.com",
  "thequietus.com",
  "crackmagazine.net",
  "headphonecommute.com",
  "acloserlisten.com",
  "igloomag.com",
  "stampthewax.com",
  // Practice
  "lionsroar.com",
  "tricycle.org",
  "psyche.co",
  "aeon.co",
  "themarginalian.org",
  "emergencemagazine.org",
  "orionmagazine.org",
];

function isAllowedHost(host) {
  const h = host.toLowerCase();
  return ALLOWED_DOMAINS.some(d => h === d || h.endsWith("." + d));
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const target = url.searchParams.get("url");
  const fresh = url.searchParams.get("fresh") === "1";

  if (!target) return json({ error: "url query param required" }, 400);

  let parsed;
  try { parsed = new URL(target); } catch {
    return json({ error: "invalid url" }, 400);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return json({ error: "only http/https" }, 400);
  }
  if (!isAllowedHost(parsed.hostname)) {
    return json({ error: "domain not in allowlist" }, 403);
  }

  const cache = caches.default;
  const cacheKey = new Request("https://daily-proxy/" + encodeURIComponent(target));

  if (!fresh) {
    const cached = await cache.match(cacheKey);
    if (cached) {
      const r = new Response(cached.body, cached);
      r.headers.set("X-Cache", "HIT");
      return r;
    }
  }

  try {
    const upstream = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
    });

    if (!upstream.ok) {
      return json({ error: `upstream ${upstream.status}` }, 502);
    }

    const body = await upstream.text();
    const response = new Response(body, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300",
        "X-Cache": "MISS",
      },
    });

    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (e) {
    return json({ error: String(e) }, 502);
  }
}
