export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Standard CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ROUTE: Root / Status check
      if (path === "/" || path === "/api") {
        const { results } = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        return Response.json({
          status: "success",
          message: "Metro Hybrid Engine & Brokerage API is live!",
          tables: results
        }, { headers: corsHeaders });
      }

      // ROUTE: GET /api/users - List all users
      if (path === "/api/users" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM users").all();
        return Response.json({ status: "success", data: results }, { headers: corsHeaders });
      }

      // ROUTE: POST /api/users - Create a new user
      if (path === "/api/users" && method === "POST") {
        const body: any = await request.json();
        await env.DB.prepare("INSERT INTO users (name, email, role) VALUES (?, ?, ?)")
          .bind(body.name, body.email, body.role || 'client')
          .run();
        return Response.json({ status: "success", message: "User created successfully" }, { headers: corsHeaders });
      }

      // ROUTE: GET /api/orders - List brokerage orders
      if (path === "/api/orders" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM orders").all();
        return Response.json({ status: "success", data: results }, { headers: corsHeaders });
      }

      // ROUTE: POST /api/orders - Place a new trade order
      if (path === "/api/orders" && method === "POST") {
        const body: any = await request.json();
        await env.DB.prepare("INSERT INTO orders (user_id, symbol, side, quantity, price, status) VALUES (?, ?, ?, ?, ?, ?)")
          .bind(body.user_id, body.symbol, body.side, body.quantity, body.price, body.status || 'PENDING')
          .run();
        return Response.json({ status: "success", message: "Trade order placed successfully" }, { headers: corsHeaders });
      }

      return Response.json({ status: "error", message: "Endpoint not found" }, { status: 404, headers: corsHeaders });

    } catch (error: any) {
      return Response.json({ status: "error", message: error.message }, { status: 500, headers: corsHeaders });
    }
  },
};
