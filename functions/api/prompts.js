
export async function onRequestGet(context) {
  const { env } = context;
  
  try {
    // 列出所有以 "prompt:" 开头的键
    const list = await env.NANO_KV.list({ prefix: "prompt:" });
    
    // 并行获取所有提示词的具体内容
    const prompts = await Promise.all(
      list.keys.map(async (key) => {
        const value = await env.NANO_KV.get(key.name);
        return JSON.parse(value);
      })
    );

    // 按日期倒序排列
    prompts.sort((a, b) => new Date(b.date) - new Date(a.date));

    return new Response(JSON.stringify(prompts), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const data = await request.json();
    
    // 简单的鉴权：检查请求体中是否包含正确的管理员密码 (这里复用前端的 '123' 逻辑，生产环境建议更严格)
    // 注意：我们在 App.tsx 发送请求时需要附带 password 字段
    if (data.authPassword !== '123') {
       return new Response("Unauthorized", { status: 401 });
    }

    // 处理图片上传
    // 如果 imageUrl 是 base64 数据 (新上传的图片)，则上传到 R2
    if (data.imageUrl && data.imageUrl.startsWith("data:")) {
      const base64Data = data.imageUrl.split(',')[1];
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const fileName = `images/${data.id}-${Date.now()}.jpg`;
      
      // 上传到 R2
      await env.NANO_BUCKET.put(fileName, binaryData, {
        httpMetadata: { contentType: 'image/jpeg' },
      });

      // 替换 data 中的 imageUrl 为 R2 的公开访问地址
      // 需要在 Cloudflare 环境变量中配置 PUBLIC_R2_DOMAIN
      const r2Domain = env.PUBLIC_R2_DOMAIN || ""; 
      data.imageUrl = `${r2Domain}/${fileName}`;
    }

    // 清理掉不需要存入 KV 的临时字段
    delete data.authPassword;

    // 存入 KV
    await env.NANO_KV.put(`prompt:${data.id}`, JSON.stringify(data));

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
