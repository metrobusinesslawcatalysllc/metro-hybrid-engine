export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Standard CORS headers for your browser dashboards
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 1. Health Check Endpoint
      if (url.pathname === "/") {
        return new Response(
          JSON.stringify({ status: "online", system: "Metro Hybrid Engine Active" }), 
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 2. Fetch Users Endpoint (Includes Super Masters, Managers, Sub-Admin Supporters, Clients)
      if (url.pathname === "/api/users" && request.method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM users").all();
        return new Response(
          JSON.stringify(results), 
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 3. Fetch Support Tickets Endpoint (Assigned to Sub-Admin Supporters)
      if (url.pathname === "/api/tickets" && request.method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM support_tickets").all();
        return new Response(
          JSON.stringify(results), 
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response("Endpoint Not Found", { status: 404, headers: corsHeaders });
      
    } catch (err: any) {
      return new Response(
        JSON.stringify({ error: err.message }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  },
};
