import { useEffect, useState } from "react";
import { Settings as SettingsIcon, ShoppingCart, Loader2, CheckCircle2, XCircle, Save, Download, Cloud } from "lucide-react";

interface ImportStatus {
  type: string;
  is_importing: number;
  imported_count: number;
  total_count: number;
  error: string | null;
}

export default function Settings() {
  const [status, setStatus] = useState<"loading" | "connected" | "disconnected">("loading");
  const [error, setError] = useState<string | null>(null);
  
  const [settings, setSettings] = useState({
    WC_URL: "",
    WC_CONSUMER_KEY: "",
    WC_CONSUMER_SECRET: ""
  });
  const [saving, setSaving] = useState(false);
  const [importStatuses, setImportStatuses] = useState<Record<string, ImportStatus>>({});

  const checkStatus = async () => {
    try {
      const response = await fetch("/api/woocommerce/status");
      const data = await response.json();
      if (response.ok && data.status === "connected") {
        setStatus("connected");
      } else {
        setStatus("disconnected");
        setError(data.error || "Failed to connect");
      }
    } catch (err) {
      setStatus("disconnected");
      setError((err as Error).message);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      const data = await response.json();
      setSettings(data);
    } catch (err) {
      console.error("Failed to load settings", err);
    }
  };

  const fetchImportStatus = async () => {
    try {
      const response = await fetch("/api/import/status");
      const data: ImportStatus[] = await response.json();
      const statusMap: Record<string, ImportStatus> = {};
      data.forEach(item => {
        statusMap[item.type] = item;
      });
      setImportStatuses(statusMap);
    } catch (err) {
      console.error("Failed to fetch import status", err);
    }
  };

  useEffect(() => {
    loadSettings();
    checkStatus();
    fetchImportStatus();

    const interval = setInterval(fetchImportStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      await checkStatus();
    } catch (err) {
      console.error("Failed to save settings", err);
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async (type: "products" | "orders") => {
    try {
      const response = await fetch(`/api/import/${type}`, { method: "POST" });
      if (!response.ok) {
        const data = await response.json();
        alert(data.error || `Failed to start ${type} import`);
      }
      fetchImportStatus();
    } catch (err) {
      console.error(`Failed to start ${type} import`, err);
    }
  };

  const renderImportStatus = (type: "products" | "orders") => {
    const status = importStatuses[type];
    if (!status) return null;

    if (status.is_importing) {
      return (
        <div className="flex items-center gap-2 text-sm text-blue-600 font-medium bg-blue-50/50 px-3 py-1.5 rounded-full">
          <Loader2 className="w-4 h-4 animate-spin" />
          {status.imported_count} з {status.total_count}
        </div>
      );
    }

    if (status.error) {
      return <div className="text-sm text-red-500 font-medium bg-red-50/50 px-3 py-1.5 rounded-full">Помилка: {status.error}</div>;
    }

    if (status.total_count > 0 && status.imported_count === status.total_count) {
      return <div className="text-sm text-emerald-600 font-medium bg-emerald-50/50 px-3 py-1.5 rounded-full">Завершено ({status.total_count})</div>;
    }

    return null;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <SettingsIcon className="w-6 h-6 text-blue-600" />
            </div>
            Settings
          </h1>
          <p className="text-zinc-500 mt-2 text-[15px]">Manage your integrations and preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* WooCommerce Integration Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-zinc-200/60 p-8 flex flex-col">
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                <ShoppingCart className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-zinc-900 tracking-tight">WooCommerce</h2>
                <p className="text-[15px] text-zinc-500 mt-0.5">Інтеграція з інтернет-магазином</p>
              </div>
            </div>
            
            {/* Status Indicator */}
            {status === "loading" ? (
              <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
            ) : status === "connected" ? (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-sm font-medium shadow-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                Connected
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-200/60 text-red-700 text-sm font-medium shadow-sm">
                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"></div>
                Not connected
              </div>
            )}
          </div>

          <div className="space-y-5 mb-8">
            <div>
              <label className="block text-[13px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">URL сайту</label>
              <input
                type="text"
                value={settings.WC_URL}
                onChange={(e) => setSettings({...settings, WC_URL: e.target.value})}
                placeholder="https://your-store.com"
                className="w-full px-4 py-3 bg-zinc-50/50 border border-zinc-200/80 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-[15px] text-zinc-900 placeholder:text-zinc-400"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">API Consumer Key</label>
              <input
                type="text"
                value={settings.WC_CONSUMER_KEY}
                onChange={(e) => setSettings({...settings, WC_CONSUMER_KEY: e.target.value})}
                placeholder="ck_..."
                className="w-full px-4 py-3 bg-zinc-50/50 border border-zinc-200/80 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-[15px] text-zinc-900 placeholder:text-zinc-400"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">API Consumer Secret</label>
              <input
                type="password"
                value={settings.WC_CONSUMER_SECRET}
                onChange={(e) => setSettings({...settings, WC_CONSUMER_SECRET: e.target.value})}
                placeholder="cs_..."
                className="w-full px-4 py-3 bg-zinc-50/50 border border-zinc-200/80 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-[15px] text-zinc-900 placeholder:text-zinc-400"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3.5 rounded-xl font-medium transition-all shadow-sm disabled:opacity-50 mt-2"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Зберегти налаштування
            </button>
          </div>

          <div className="pt-8 border-t border-zinc-100 space-y-5">
            <h3 className="text-[13px] font-semibold text-zinc-500 uppercase tracking-wider">Синхронізація даних</h3>
            
            <div className="flex items-center justify-between bg-zinc-50/50 p-4 rounded-2xl border border-zinc-100">
              <button
                onClick={() => handleImport("products")}
                disabled={importStatuses.products?.is_importing === 1 || status !== "connected"}
                className="flex items-center gap-2 bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-200/80 shadow-sm px-5 py-2.5 rounded-full font-medium transition-all disabled:opacity-50 text-sm"
              >
                <Cloud className="w-4 h-4 text-blue-500" />
                Імпортувати товари
              </button>
              {renderImportStatus("products")}
            </div>

            <div className="flex items-center justify-between bg-zinc-50/50 p-4 rounded-2xl border border-zinc-100">
              <button
                onClick={() => handleImport("orders")}
                disabled={importStatuses.orders?.is_importing === 1 || status !== "connected"}
                className="flex items-center gap-2 bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-200/80 shadow-sm px-5 py-2.5 rounded-full font-medium transition-all disabled:opacity-50 text-sm"
              >
                <Cloud className="w-4 h-4 text-blue-500" />
                Імпортувати замовлення
              </button>
              {renderImportStatus("orders")}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-100">
            {status === "connected" ? (
              <div className="flex items-center gap-2 text-[15px] text-emerald-600 font-medium">
                <CheckCircle2 className="w-5 h-5" />
                Successfully authenticated with WooCommerce API
              </div>
            ) : status === "disconnected" ? (
              <div className="flex items-start gap-3 text-[15px] text-red-600">
                <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Connection failed</p>
                  <p className="text-red-500/80 mt-0.5 text-sm">{error}</p>
                </div>
              </div>
            ) : (
              <div className="text-[15px] text-zinc-500">Checking connection status...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
