
export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const { password } = await request.json();
    
    // Cloudflare Environment Variable: PASSWORD
    // NOTE: If you just added this variable in the dashboard, you MUST REDEPLOY the project for it to work.
    const serverPassword = env.PASSWORD;
    
    // Normalize passwords (trim whitespace) to avoid copy-paste errors
    // Fallback to '123' only if the environment variable is completely missing
    const validPassword = serverPassword ? String(serverPassword).trim() : '123';
    const inputPassword = password ? String(password).trim() : '';

    if (inputPassword && inputPassword === validPassword) {
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
