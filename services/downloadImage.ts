// 通用图片下载：优先取 blob 后另存（可绕过跨域 a[download] 被忽略的问题），失败则回退直链
const triggerDownload = (href: string, filename: string) => {
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
};

export const safeFileName = (name: string) =>
    (name || 'image').replace(/[\\/:*?"<>|\r\n]/g, '_').slice(0, 80) || 'image';

export const getImageExtension = (url: string) => {
    const dataMime = url.match(/^data:image\/([a-zA-Z0-9.+-]+);/);
    if (dataMime) {
        const mime = dataMime[1].toLowerCase();
        const aliases: Record<string, string> = { jpeg: 'jpg', 'svg+xml': 'svg', 'x-icon': 'ico' };
        return aliases[mime] || mime;
    }
    const clean = url.split('?')[0].split('#')[0];
    const ext = clean.split('.').pop()?.toLowerCase();
    return ext && ext.length <= 5 ? ext : 'png';
};

export const downloadImage = async (url: string, filename: string) => {
    if (!url) return;
    const name = safeFileName(filename);
    try {
        // 跨域图片（R2 公共域无 CORS）必须走同源代理，否则浏览器会忽略 a[download] 直接打开图片
        const target = url.startsWith('data:') || url.startsWith('blob:')
            ? url
            : `/api/image-proxy?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`;
        const res = await fetch(target);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) throw new Error('Not an image');
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        triggerDownload(objectUrl, name);
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
    } catch {
        // 代理不可用时退回直链；data URL / 同源图仍可直接下载
        triggerDownload(url, name);
    }
};
