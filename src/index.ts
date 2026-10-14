export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    const json = (data: any, status = 200) =>
      new Response(JSON.stringify(data, null, 2), {
        status,
        headers: { "Content-Type": "application/json" },
      });

    try {
      // Root check
      if (path === "/") {
        return json({ status: "online", engine: "metro-hybrid-engine", module: "ledger-active" });
      }

      // GET /api/users
      if (path === "/api/users" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM users").all();
        return json({ users: results });
      }

      // ==========================================
      // ACCOUNT LEDGER ENDPOINTS
      // ==========================================

      // GET /api/accounts (All accounts or filtered by ?userId=...)
      if (path === "/api/accounts" && method === "GET") {
        const userId = url.searchParams.get("userId");
        if (userId) {
          const { results } = await env.DB.prepare("SELECT * FROM accounts WHERE user_id = ?")
            .bind(userId)
            .all();
          return json({ accounts: results });
        }
        const { results } = await env.DB.prepare("SELECT * FROM accounts").all();
        return json({ accounts: results });
      }

      // POST /api/accounts (Create a new account/wallet)
      if (path === "/api/accounts" && method === "POST") {
        const body = await request.json() as {
          userId: number;
          accountType?: string;
          currency?: string;
          balance?: number;
        };

        if (!body.userId) {
          return json({ error: "Missing required field: userId" }, 400);
        }

        const accountType = body.accountType || "brokerage";
        const currency = body.currency || "USD";
        const balance = body.balance || 0.0;

        const newAccount = await env.DB.prepare(
          "INSERT INTO accounts (user_id, account_type, currency, balance) VALUES (?, ?, ?, ?) RETURNING *"
        )
          .bind(body.userId, accountType, currency, balance)
          .first();

        return json({ message: "Account created successfully", account: newAccount }, 201);
      }

      // POST /api/accounts/deposit (Simulate fund deposit)
      if (path === "/api/accounts/deposit" && method === "POST") {
        const body = await request.json() as {
          accountId: number;
          amount: number;
        };

        if (!body.accountId || body.amount === undefined || body.amount <= 0) {
          return json({ error: "Invalid accountId or deposit amount" }, 400);
        }

        // Verify account exists
        const account = await env.DB.prepare("SELECT * FROM accounts WHERE id = ?")
          .bind(body.accountId)
          .first();

        if (!account) {
          return json({ error: "Account not found" }, 404);
        }

        // Update balance
        await env.DB.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?")
          .bind(body.amount, body.accountId)
          .run();

        const updatedAccount = await env.DB.prepare("SELECT * FROM accounts WHERE id = ?")
          .bind(body.accountId)
          .first();

        return json({ message: "Deposit processed successfully", account: updatedAccount });
      }

      return json({ error: "Endpoint Not Found" }, 404);
    } catch (err: any) {
      return json({ error: err.message }, 500);
    }
  },
};
