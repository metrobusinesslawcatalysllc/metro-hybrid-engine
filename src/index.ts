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
      // Test the D1 database connection by fetching existing tables
      const { results } = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      
      return Response.json({
        status: "success",
        message: "Metro Hybrid Engine API is online and connected to D1!",
        database_tables: results
      }, { headers: corsHeaders });
    } catch (error: any) {
      return Response.json({
        status: "error",
        message: error.message
      }, { status: 500, headers: corsHeaders });
    }
  },
};
