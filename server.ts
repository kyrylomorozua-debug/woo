import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import Database from "better-sqlite3";

dotenv.config();

const db = new Database("crm.sqlite");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT,
    price TEXT,
    regular_price TEXT,
    sale_price TEXT,
    stock_quantity INTEGER,
    stock_status TEXT,
    images TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY,
    number TEXT,
    status TEXT,
    total TEXT,
    currency TEXT,
    date_created TEXT,
    billing TEXT
  );

  CREATE TABLE IF NOT EXISTS import_status (
    type TEXT PRIMARY KEY,
    is_importing INTEGER DEFAULT 0,
    imported_count INTEGER DEFAULT 0,
    total_count INTEGER DEFAULT 0,
    error TEXT
  );
  
  INSERT OR IGNORE INTO import_status (type, is_importing, imported_count, total_count) VALUES ('products', 0, 0, 0);
  INSERT OR IGNORE INTO import_status (type, is_importing, imported_count, total_count) VALUES ('orders', 0, 0, 0);
`);

const getSetting = (key: string) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row ? row.value : null;
};

const setSetting = (key: string, value: string) => {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper to fetch from WooCommerce API
  const fetchWooCommerce = async (endpoint: string, method = "GET") => {
    const url = getSetting("WC_URL") || process.env.WC_URL;
    const key = getSetting("WC_CONSUMER_KEY") || process.env.WC_CONSUMER_KEY;
    const secret = getSetting("WC_CONSUMER_SECRET") || process.env.WC_CONSUMER_SECRET;

    if (!url || !key || !secret) {
      throw new Error("WooCommerce credentials are not fully configured.");
    }

    const auth = btoa(`${key}:${secret}`);
    
    // Ensure URL doesn't end with slash and endpoint doesn't start with slash
    const baseUrl = url.replace(/\/$/, "");
    const cleanEndpoint = endpoint.replace(/^\//, "");
    
    const response = await fetch(`${baseUrl}/wp-json/wc/v3/${cleanEndpoint}`, {
      method,
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.statusText}`);
    }

    return response;
  };

  // API Routes
  app.get("/api/settings", (req, res) => {
    res.json({
      WC_URL: getSetting("WC_URL") || "",
      WC_CONSUMER_KEY: getSetting("WC_CONSUMER_KEY") || "",
      WC_CONSUMER_SECRET: getSetting("WC_CONSUMER_SECRET") || "",
    });
  });

  app.post("/api/settings", (req, res) => {
    const { WC_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET } = req.body;
    if (WC_URL !== undefined) setSetting("WC_URL", WC_URL);
    if (WC_CONSUMER_KEY !== undefined) setSetting("WC_CONSUMER_KEY", WC_CONSUMER_KEY);
    if (WC_CONSUMER_SECRET !== undefined) setSetting("WC_CONSUMER_SECRET", WC_CONSUMER_SECRET);
    res.json({ success: true });
  });

  app.get("/api/woocommerce/status", async (req, res) => {
    try {
      await fetchWooCommerce("system_status");
      res.json({ status: "connected" });
    } catch (error) {
      res.status(500).json({ status: "disconnected", error: (error as Error).message });
    }
  });

  app.get("/api/woocommerce/orders", (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const totalObj = db.prepare("SELECT COUNT(*) as count FROM orders").get() as { count: number };
      const total = totalObj.count;

      const orders = db.prepare("SELECT * FROM orders ORDER BY date_created DESC LIMIT ? OFFSET ?")
        .all(limit, offset)
        .map((order: any) => ({
          ...order,
          billing: JSON.parse(order.billing)
        }));
        
      res.json({
        data: orders,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/woocommerce/products", (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const totalObj = db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number };
      const total = totalObj.count;

      const products = db.prepare("SELECT * FROM products ORDER BY id DESC LIMIT ? OFFSET ?")
        .all(limit, offset)
        .map((product: any) => ({
          ...product,
          images: JSON.parse(product.images)
        }));
        
      res.json({
        data: products,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/import/status", (req, res) => {
    const statuses = db.prepare("SELECT * FROM import_status").all();
    res.json(statuses);
  });

  const runImport = async (type: "products" | "orders") => {
    const updateStatus = db.prepare("UPDATE import_status SET is_importing = ?, imported_count = ?, total_count = ?, error = ? WHERE type = ?");
    
    try {
      updateStatus.run(1, 0, 0, null, type);
      
      // First get total count
      const headResponse = await fetchWooCommerce(`${type}?per_page=1`);
      const totalPages = parseInt(headResponse.headers.get("x-wp-totalpages") || "1", 10);
      const totalItems = parseInt(headResponse.headers.get("x-wp-total") || "0", 10);
      
      updateStatus.run(1, 0, totalItems, null, type);
      
      let importedCount = 0;
      
      for (let page = 1; page <= totalPages; page++) {
        const response = await fetchWooCommerce(`${type}?per_page=100&page=${page}`);
        const items = await response.json();
        
        const insertProduct = db.prepare("INSERT INTO products (id, name, price, regular_price, sale_price, stock_quantity, stock_status, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, price=excluded.price, regular_price=excluded.regular_price, sale_price=excluded.sale_price, stock_quantity=excluded.stock_quantity, stock_status=excluded.stock_status, images=excluded.images");
        const insertOrder = db.prepare("INSERT INTO orders (id, number, status, total, currency, date_created, billing) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET status=excluded.status, total=excluded.total, currency=excluded.currency, date_created=excluded.date_created, billing=excluded.billing");
        
        const transaction = db.transaction((itemsToSave: any[]) => {
          for (const item of itemsToSave) {
            if (type === "products") {
              insertProduct.run(item.id, item.name, item.price, item.regular_price, item.sale_price, item.stock_quantity, item.stock_status, JSON.stringify(item.images || []));
            } else {
              insertOrder.run(item.id, item.number, item.status, item.total, item.currency, item.date_created, JSON.stringify(item.billing || {}));
            }
          }
        });
        
        transaction(items);
        importedCount += items.length;
        updateStatus.run(1, importedCount, totalItems, null, type);
      }
      
      updateStatus.run(0, importedCount, totalItems, null, type);
    } catch (error) {
      console.error(`Import error for ${type}:`, error);
      updateStatus.run(0, 0, 0, (error as Error).message, type);
    }
  };

  app.post("/api/import/products", (req, res) => {
    const status = db.prepare("SELECT is_importing FROM import_status WHERE type = 'products'").get() as { is_importing: number };
    if (status.is_importing) {
      return res.status(400).json({ error: "Import already in progress" });
    }
    runImport("products");
    res.json({ success: true });
  });

  app.post("/api/import/orders", (req, res) => {
    const status = db.prepare("SELECT is_importing FROM import_status WHERE type = 'orders'").get() as { is_importing: number };
    if (status.is_importing) {
      return res.status(400).json({ error: "Import already in progress" });
    }
    runImport("orders");
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
