
export async function onRequestGet(context) {
  const { env } = context;
  
  try {
    // List keys with prefix "prompt:"
    const list = await env.NANO_KV.list({ prefix: "prompt:" });
    
    // Fetch values in parallel
    const prompts = await Promise.all(
      list.keys.map(async (key) => {
        const value = await env.NANO_KV.get(key.name);
        return JSON.parse(value);
      })
    );

    // Sort by date descending
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
    
    // Auth Check
    const serverPassword = env.PASSWORD;
    const validPassword = serverPassword ? String(serverPassword).trim() : '123';
    const inputPassword = data.authPassword ? String(data.authPassword).trim() : '';
    
    if (inputPassword !== validPassword) {
       return new Response("Unauthorized", { status: 401 });
    }

    // Image Handling
    // If imageUrl is base64 (new upload), upload to R2
    if (data.imageUrl && data.imageUrl.startsWith("data:")) {
      const base64Data = data.imageUrl.split(',')[1];
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const fileName = `images/${data.id}-${Date.now()}.jpg`;
      
      // Upload to R2
      await env.NANO_BUCKET.put(fileName, binaryData, {
        httpMetadata: { contentType: 'image/jpeg' },
      });

      // Construct Public URL
      const r2Domain = env.PUBLIC_R2_DOMAIN || ""; 
      // Ensure no double slashes if domain has trailing slash
      const cleanDomain = r2Domain.endsWith('/') ? r2Domain.slice(0, -1) : r2Domain;
      data.imageUrl = `${cleanDomain}/${fileName}`;
    }

    // Clean up sensitive/temp fields before storage
    delete data.authPassword;

    // Save to KV
    await env.NANO_KV.put(`prompt:${data.id}`, JSON.stringify(data));

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
