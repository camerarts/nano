export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const { password } = await request.json();
    
    // Check against the PASSWORD environment variable in Cloudflare
    // Fallback to '123' only if variable is not set (legacy support during migration)
    const validPassword = env.PASSWORD || '123';

    if (password === validPassword) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    } else {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
