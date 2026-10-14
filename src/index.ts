export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data, null, 2), {
        status,
        headers: { "Content-Type": "application/json" },
      });

    try {
      // Root check
      if (path === "/") {
        return json({ status: "online", engine: "metro-hybrid-engine", module: "ledger-and-market-active" });
      }

      // GET /api/users
      if (path === "/api/users" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM users").all();
        return json({ users: results });
      }

      // ==========================================
      // ACCOUNT LEDGER ENDPOINTS
      // ==========================================

      // GET /api/accounts
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

      // POST /api/accounts
      if (path === "/api/accounts" && method === "POST") {
        const body = await request.json();
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

      // POST /api/accounts/deposit
      if (path === "/api/accounts/deposit" && method === "POST") {
        const body = await request.json();
        if (!body.accountId || body.amount === undefined || body.amount <= 0) {
          return json({ error: "Invalid accountId or deposit amount" }, 400);
        }

        const account = await env.DB.prepare("SELECT * FROM accounts WHERE id = ?")
          .bind(body.accountId)
          .first();

        if (!account) {
          return json({ error: "Account not found" }, 404);
        }

        await env.DB.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?")
          .bind(body.amount, body.accountId)
          .run();

        const updatedAccount = await env.DB.prepare("SELECT * FROM accounts WHERE id = ?")
          .bind(body.accountId)
          .first();

        return json({ message: "Deposit processed successfully", account: updatedAccount });
      }

      // ==========================================
      // MARKET DATA ENDPOINTS (WITH RATE-LIMIT FALLBACK)
      // ==========================================

      // GET /api/market/quote?symbol=AAPL
      if (path === "/api/market/quote" && method === "GET") {
        const symbol = (url.searchParams.get("symbol") || "IBM").toUpperCase();
        const apiKey = env.ALPHA_VANTAGE_API_KEY;

        if (!apiKey) {
          return json({ error: "ALPHA_VANTAGE_API_KEY secret is not set in Cloudflare environment variables." }, 500);
        }

        try {
          const externalUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
          const response = await fetch(externalUrl);
          const marketData = await response.json();

          // If Alpha Vantage hits rate limit or returns empty quote data, serve mock quote for development
          if (marketData.Information || !marketData["Global Quote"] || Object.keys(marketData["Global Quote"]).length === 0) {
            return json({
              symbol: symbol,
              source: "fallback-mock-due-to-rate-limit",
              data: {
                "Global Quote": {
                  "01. symbol": symbol,
                  "02. open": "180.00",
                  "03. high": "182.50",
                  "04. low": "179.20",
                  "05. price": "181.25",
                  "06. volume": "50000000",
                  "07. latest trading day": "2026-10-15",
                  "08. previous close": "179.50",
                  "09. change": "1.75",
                  "10. change percent": "0.97%"
                }
              }
            });
          }

          return json({ symbol: symbol, data: marketData });
        } catch (err) {
          return json({ error: "Failed to fetch market data", details: err.message }, 500);
        }
      }

      return json({ error: "Endpoint Not Found" }, 404);
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  },
};
