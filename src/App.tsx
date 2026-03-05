import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, Package, Settings as SettingsIcon } from "lucide-react";
import Orders from "./pages/Orders";
import Products from "./pages/Products";
import Settings from "./pages/Settings";

function Sidebar() {
  const location = useLocation();

  const links = [
    { name: "Orders", path: "/orders", icon: ShoppingCart },
    { name: "Products", path: "/products", icon: Package },
    { name: "Settings", path: "/settings", icon: SettingsIcon },
  ];

  return (
    <div className="w-64 bg-zinc-50/80 backdrop-blur-xl border-r border-zinc-200/80 min-h-screen p-5 flex flex-col">
      <div className="flex items-center gap-3 font-semibold text-xl mb-10 px-2 text-zinc-900 tracking-tight">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-sm">
          <LayoutDashboard className="w-5 h-5 text-white" />
        </div>
        <span>CRM System</span>
      </div>
      <nav className="flex-1 space-y-1.5">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path || (location.pathname === "/" && link.path === "/orders");
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm ${
                isActive 
                  ? "bg-white shadow-sm border border-zinc-200/60 text-blue-600" 
                  : "text-zinc-500 hover:bg-zinc-200/50 hover:text-zinc-900 border border-transparent"
              }`}
            >
              <Icon className="w-5 h-5" />
              {link.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-[#fbfbfd] font-sans text-[#1d1d1f]">
        <Sidebar />
        <main className="flex-1 p-10 overflow-auto">
          <Routes>
            <Route path="/" element={<Orders />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/products" element={<Products />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
