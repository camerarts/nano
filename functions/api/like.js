
export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const { id } = await request.json();
    const key = `prompt:${id}`;
    
    // 获取当前数据
    const existing = await env.NANO_KV.get(key);
    if (!existing) {
      return new Response("Not found", { status: 404 });
    }

    const promptData = JSON.parse(existing);
    
    // 增加点赞数
    promptData.likes = (promptData.likes || 0) + 1;
    
    // 写回 KV
    await env.NANO_KV.put(key, JSON.stringify(promptData));

    return new Response(JSON.stringify({ likes: promptData.likes }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
