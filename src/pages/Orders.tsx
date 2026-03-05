import { useEffect, useState } from "react";
import { ShoppingBag, Loader2, AlertCircle } from "lucide-react";

interface Order {
  id: number;
  number: string;
  status: string;
  total: string;
  currency: string;
  date_created: string;
  billing: {
    first_name: string;
    last_name: string;
  };
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/woocommerce/orders?page=${page}&limit=20`);
        if (!response.ok) {
          throw new Error("Failed to fetch orders");
        }
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setOrders(data.data);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [page]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-100/80 text-emerald-700";
      case "processing":
        return "bg-blue-100/80 text-blue-700";
      case "on-hold":
        return "bg-amber-100/80 text-amber-700";
      case "cancelled":
      case "refunded":
      case "failed":
        return "bg-red-100/80 text-red-700";
      default:
        return "bg-zinc-100 text-zinc-700";
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-blue-600" />
            </div>
            Orders
          </h1>
          <p className="text-zinc-500 mt-2 text-[15px]">Manage your WooCommerce orders</p>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50/50 border border-red-200/60 rounded-3xl p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
          <div>
            <h3 className="text-red-800 font-medium">Error loading orders</h3>
            <p className="text-red-600/80 mt-1 text-[15px]">{error}</p>
            <p className="text-red-600/80 mt-2 text-sm">Make sure your WooCommerce credentials are configured in Settings.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-zinc-200/60 overflow-hidden flex flex-col">
          <div className="overflow-x-auto relative min-h-[400px]">
            {loading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            )}
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 border-b border-zinc-200/60 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  <th className="py-4 px-6">Order</th>
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Customer</th>
                  <th className="py-4 px-6 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {!loading && orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-zinc-500 text-[15px]">
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="py-4 px-6 font-medium text-zinc-900">
                        #{order.number}
                      </td>
                      <td className="py-4 px-6 text-zinc-500 text-[15px]">
                        {new Date(order.date_created).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-zinc-700 text-[15px]">
                        {order.billing.first_name} {order.billing.last_name}
                      </td>
                      <td className="py-4 px-6 text-right font-medium text-zinc-900">
                        {order.total} {order.currency}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-4 border-t border-zinc-200/60 bg-zinc-50/50 flex items-center justify-between mt-auto">
            <span className="text-[13px] font-medium text-zinc-500">
              Showing {orders.length > 0 ? ((page - 1) * 20) + 1 : 0} to {Math.min(page * 20, total)} of {total} entries
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="px-3 py-1.5 text-[13px] font-semibold text-zinc-700 bg-white border border-zinc-200/80 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
              >
                Previous
              </button>
              <span className="text-[13px] font-semibold text-zinc-700 px-2">
                Page {page} of {totalPages || 1}
              </span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || totalPages === 0 || loading}
                className="px-3 py-1.5 text-[13px] font-semibold text-zinc-700 bg-white border border-zinc-200/80 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
