// Worker сайта STREETGAMES.
//   POST /api/push  — игровой сервер (ресурс SiteSync) кладёт свежую статистику, раз в ~10 минут.
//                     Нужен заголовок Authorization: Bearer <SYNC_KEY>.
//   GET  /api/stats — сайт забирает статистику. Ответ кэшируется на минуту,
//                     так что посетители не дёргают ни KV, ни игровой сервер.
// Всё остальное — статика сайта (env.ASSETS).
//
// Нужно в Cloudflare: KV-хранилище с привязкой STATS и секрет SYNC_KEY (см. SYNC.md).

const CFX_URL = 'https://frontend.cfx-services.net/api/servers/single/9vzkrm';
const STATS_KEY = 'stats';
const CACHE_SEC = 60;
const MAX_BODY = 256 * 1024;

const json = (data, status = 200, headers = {}) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
	});

// Сравнение без утечки по времени
function sameKey(a, b) {
	const enc = new TextEncoder();
	const x = enc.encode(a), y = enc.encode(b);
	let diff = x.length ^ y.length;
	for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] | 0) ^ (y[i] | 0);
	return diff === 0;
}

async function handlePush(request, env) {
	if (request.method !== 'POST') return json({ error: 'method' }, 405);
	if (!env.SYNC_KEY || !env.STATS) return json({ error: 'not configured' }, 500);

	const auth = request.headers.get('Authorization') || '';
	if (!auth.startsWith('Bearer ') || !sameKey(auth.slice(7), env.SYNC_KEY)) {
		return json({ error: 'forbidden' }, 403);
	}

	const text = await request.text();
	if (text.length > MAX_BODY) return json({ error: 'too large' }, 413);

	let data;
	try { data = JSON.parse(text); } catch { return json({ error: 'bad json' }, 400); }
	if (!data || data.v !== 1 || typeof data.updated !== 'number') return json({ error: 'bad payload' }, 400);

	data.received = Math.floor(Date.now() / 1000);
	await env.STATS.put(STATS_KEY, JSON.stringify(data));
	return json({ ok: true });
}

// Онлайн из списка серверов FiveM: игровой сервер не трогаем
async function fetchOnline() {
	try {
		const r = await fetch(CFX_URL, {
			headers: { 'User-Agent': 'streetgames-site', Accept: 'application/json' },
			cf: { cacheTtl: CACHE_SEC, cacheEverything: true },
			signal: AbortSignal.timeout(4000),
		});
		if (!r.ok) return null;
		const d = (await r.json()).Data;
		if (!d || typeof d.clients !== 'number') return null;
		return { online: d.clients, maxPlayers: d.sv_maxclients || d.svMaxclients || null };
	} catch {
		return null;
	}
}

async function handleStats(request, env, ctx) {
	if (request.method !== 'GET' && request.method !== 'HEAD') return json({ error: 'method' }, 405);

	const cache = caches.default;
	const cacheKey = new Request(new URL('/api/stats', request.url).toString(), { method: 'GET' });
	const hit = await cache.match(cacheKey);
	if (hit) return hit;

	const [raw, live] = await Promise.all([
		// cacheTtl — KV держит значение на краю минуту (Cache API на *.workers.dev не работает,
		// так что на своём домене кэш ниже срежет запросы ещё сильнее)
		env.STATS ? env.STATS.get(STATS_KEY, { cacheTtl: CACHE_SEC }) : null,
		fetchOnline(),
	]);

	let data = null;
	try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
	data = data || { v: 1, empty: true };

	if (live) {
		data.online = live.online;
		if (live.maxPlayers) data.maxPlayers = live.maxPlayers;
		data.onlineLive = true;
	} else {
		data.onlineLive = false;   // онлайн из последней отправки сервера (может отставать)
	}

	const resp = json(data, 200, { 'Cache-Control': `public, max-age=${CACHE_SEC}` });
	ctx.waitUntil(cache.put(cacheKey, resp.clone()));
	return resp;
}

export default {
	async fetch(request, env, ctx) {
		const { pathname } = new URL(request.url);
		if (pathname === '/api/push') return handlePush(request, env);
		if (pathname === '/api/stats') return handleStats(request, env, ctx);
		return env.ASSETS.fetch(request);
	},
};
