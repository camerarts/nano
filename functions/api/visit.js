
export async function onRequestGet(context) {
  const { env } = context;
  const KEY = "site_stats:visits";
  
  try {
    // Get current count
    let count = 0;
    const value = await env.NANO_KV.get(KEY);
    
    if (value) {
      count = parseInt(value, 10);
    }
    
    // Increment
    count++;
    
    // Save back to KV
    await env.NANO_KV.put(KEY, count.toString());

    return new Response(JSON.stringify({ count }), {
      headers: { 
        "Content-Type": "application/json",
        // Disable caching so every hit counts and updates
        "Cache-Control": "no-store, max-age=0" 
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, count: 0 }), { status: 500 });
  }
}
