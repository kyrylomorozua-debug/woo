import { useEffect, useState } from "react";
import { Package, Loader2, AlertCircle } from "lucide-react";

interface Product {
  id: number;
  name: string;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_quantity: number | null;
  stock_status: string;
  images: { src: string; alt: string }[];
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/woocommerce/products?page=${page}&limit=20`);
        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setProducts(data.data);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [page]);

  const getStockStatusColor = (status: string, quantity: number | null) => {
    if (status === "instock") {
      return "bg-emerald-100/80 text-emerald-700";
    }
    if (status === "outofstock") {
      return "bg-red-100/80 text-red-700";
    }
    if (status === "onbackorder") {
      return "bg-amber-100/80 text-amber-700";
    }
    return "bg-zinc-100 text-zinc-700";
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            Products
          </h1>
          <p className="text-zinc-500 mt-2 text-[15px]">Manage your WooCommerce products</p>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50/50 border border-red-200/60 rounded-3xl p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
          <div>
            <h3 className="text-red-800 font-medium">Error loading products</h3>
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
                  <th className="py-4 px-6">Product</th>
                  <th className="py-4 px-6">Price</th>
                  <th className="py-4 px-6">Stock Status</th>
                  <th className="py-4 px-6 text-right">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {!loading && products.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-zinc-500 text-[15px]">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={product.images[0].src}
                              alt={product.images[0].alt || product.name}
                              className="w-12 h-12 rounded-xl object-cover border border-zinc-200/60 shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center border border-zinc-200/60 shadow-sm">
                              <Package className="w-6 h-6 text-zinc-400" />
                            </div>
                          )}
                          <span className="font-medium text-zinc-900">{product.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-zinc-700 font-medium">
                        {product.price ? `$${product.price}` : "-"}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${getStockStatusColor(product.stock_status, product.stock_quantity)}`}>
                          {product.stock_status === "instock" ? "In Stock" : product.stock_status === "outofstock" ? "Out of Stock" : product.stock_status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right text-zinc-700 font-medium">
                        {product.stock_quantity !== null ? product.stock_quantity : "∞"}
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
              Showing {products.length > 0 ? ((page - 1) * 20) + 1 : 0} to {Math.min(page * 20, total)} of {total} entries
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
