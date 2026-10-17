// Serveur du classement « Survie » de Duel des Trois — Cloudflare Workers (gratuit).
// Il garde les 50 meilleurs scores dans un espace de stockage KV nommé SCORES (voir LISEZ-MOI.md).
//
// Protection (limites honnêtes : le jeu tourne chez le joueur, donc rien n'est parfait) :
//  - un score doit être possible mathématiquement pour le nombre de vagues annoncé ;
//  - 1 envoi par minute et par adresse IP ;
//  - un pseudo ne garde que son meilleur score ;
//  - pseudo nettoyé (12 caractères, lettres / chiffres / espaces).

const MAX = 50;
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type' };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const clean = t => String(t || '').replace(/[^A-Za-z0-9À-ÿ _.'\-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 12);
const better = (a, b) => a.w > b.w || (a.w === b.w && a.s > b.s);

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (!env.SCORES) return json({ ok: false, err: 'Stockage SCORES non relié (voir le guide)' }, 500);

    if (url.pathname === '/top' && req.method === 'GET') {
      const top = JSON.parse((await env.SCORES.get('top')) || '[]');
      return json(top.slice(0, 20).map(({ n, w, s }) => ({ n, w, s })));
    }

    if (url.pathname === '/score' && req.method === 'POST') {
      let body;
      try { const raw = await req.text(); if (raw.length > 400) throw 0; body = JSON.parse(raw); } catch (e) { return json({ ok: false, err: 'requête invalide' }, 400); }
      const n = clean(body.n), w = body.w, s = body.s;
      if (!n) return json({ ok: false, err: 'pseudo invalide' }, 400);
      if (!Number.isInteger(w) || !Number.isInteger(s) || w < 1 || w > 300) return json({ ok: false, err: 'score invalide' }, 400);
      // chaque vague k rapporte 100k + (au plus 180 de temps) + (au plus 50 de vie) points
      const min = 50 * w * (w + 1), max = min + 230 * w;
      if (s < min || s > max) return json({ ok: false, err: 'score impossible' }, 400);
      const ip = req.headers.get('CF-Connecting-IP') || 'inconnue';
      if (await env.SCORES.get('rl:' + ip)) return json({ ok: false, err: 'un envoi par minute, réessaie plus tard' }, 429);
      await env.SCORES.put('rl:' + ip, '1', { expirationTtl: 60 });

      let top = JSON.parse((await env.SCORES.get('top')) || '[]');
      const key = n.toLowerCase(), i = top.findIndex(e => e.n.toLowerCase() === key);
      const entry = { n, w, s, d: Date.now() };
      if (i >= 0) { if (better(entry, top[i])) top[i] = entry; } else top.push(entry);
      top.sort((a, b) => b.w - a.w || b.s - a.s || a.d - b.d);
      top = top.slice(0, MAX);
      await env.SCORES.put('top', JSON.stringify(top));
      const rank = top.findIndex(e => e.n.toLowerCase() === key) + 1;
      return json({ ok: true, rank: rank > 0 ? rank : 0 });
    }

    return json({ ok: false, err: 'introuvable' }, 404);
  }
};
