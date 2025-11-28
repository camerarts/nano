
export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    // Check Admin Auth for GET via Header
    const serverPassword = env.PASSWORD;
    const validPassword = serverPassword ? String(serverPassword).trim() : '123';
    const inputPassword = request.headers.get('X-Admin-Pass');
    const isAdmin = inputPassword && inputPassword.trim() === validPassword;

    // List keys with prefix "prompt:"
    const list = await env.NANO_KV.list({ prefix: "prompt:" });
    
    // Fetch values in parallel
    const prompts = await Promise.all(
      list.keys.map(async (key) => {
        const value = await env.NANO_KV.get(key.name);
        return JSON.parse(value);
      })
    );

    // Filter: Admin sees all, Public sees only approved
    const filteredPrompts = prompts.filter(p => {
        // If status is missing (legacy data), treat as approved
        const status = p.status || 'approved';
        if (isAdmin) return true;
        return status === 'approved';
    });

    // Sort by date descending
    filteredPrompts.sort((a, b) => new Date(b.date) - new Date(a.date));

    return new Response(JSON.stringify(filteredPrompts), {
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
    const isAdmin = inputPassword === validPassword;
    
    // Logic for Public vs Admin
    if (!isAdmin) {
       // Force status to pending for public submissions
       data.status = 'pending';
       // Prevent public from setting official flag
       data.isOfficial = false;
       // Ensure likes start at 0
       if (!data.id) data.likes = 0; 
    } else {
        // Admin can set status, if not provided, default to approved (or keep existing)
        if (!data.status) data.status = 'approved';
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

export async function onRequestDelete(context) {
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

    if (!data.id) {
        return new Response("Missing ID", { status: 400 });
    }

    // Delete from KV
    await env.NANO_KV.delete(`prompt:${data.id}`);

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
     return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
