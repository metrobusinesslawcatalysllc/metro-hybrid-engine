// ==========================================
      // MARKET DATA ENDPOINTS
      // ==========================================

      // GET /api/market/quote?symbol=AAPL
      if (path === "/api/market/quote" && method === "GET") {
        const symbol = url.searchParams.get("symbol") || "IBM";
        const apiKey = env.ALPHA_VANTAGE_API_KEY;

        if (!apiKey) {
          return json({ error: "ALPHA_VANTAGE_API_KEY secret is not set in Cloudflare environment variables." }, 500);
        }

        const externalUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
        const response = await fetch(externalUrl);
        const marketData = await response.json();

        return json({ symbol: symbol.toUpperCase(), data: marketData });
      }
