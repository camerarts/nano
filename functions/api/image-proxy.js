// 同源图片下载代理：R2 公共域没有 CORS，前端直接 a[download] 跨域会被浏览器忽略并打开图片。
// 这里由 Worker 服务端取图，再用 Content-Disposition: attachment 返回，保证浏览器保存到本地。
// 仅允许同源地址与已配置的 R2 域，避免被当成任意 URL 代理（SSRF）。

const sanitizeName = (name) =>
    (name || 'image').replace(/[\\/:*?"<>|\r\n]/g, '_').slice(0, 80) || 'image';

export async function onRequest({ request, env }) {
    const reqUrl = new URL(request.url);
    const raw = reqUrl.searchParams.get('url') || '';
    const name = sanitizeName(reqUrl.searchParams.get('name') || 'image');

    if (!raw) return new Response('Missing url', { status: 400 });

    let target;
    try {
        target = new URL(raw);
    } catch {
        return new Response('Invalid url', { status: 400 });
    }
    if (target.protocol !== 'https:' && target.protocol !== 'http:') {
        return new Response('Unsupported protocol', { status: 400 });
    }

    const allowed = new Set([reqUrl.origin]);
    if (env.PUBLIC_R2_DOMAIN) {
        try { allowed.add(new URL(env.PUBLIC_R2_DOMAIN).origin); } catch { /* 配置异常则忽略 */ }
    }
    // 已知 R2 公共域兜底（env 未注入时仍可下载）
    allowed.add('https://nanoimages.10125800.xyz');
    if (!allowed.has(target.origin)) {
        return new Response('Forbidden host', { status: 403 });
    }

    try {
        const upstream = await fetch(target.toString(), {
            headers: { Accept: 'image/*' },
        });
        if (!upstream.ok) return new Response('Upstream error', { status: 502 });

        const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
        const asciiName = name.replace(/[^\x20-\x7E]/g, '_');
        return new Response(upstream.body, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(name)}`,
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': reqUrl.origin,
            },
        });
    } catch (e) {
        return new Response(`Proxy error: ${String(e).slice(0, 120)}`, { status: 502 });
    }
}
