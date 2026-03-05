import { useEffect, useState } from "react";
import api from "../lib/api";
import { supabase } from "../lib/supabase";
import { RefreshCw, Link2, Settings, CheckCircle, XCircle } from "lucide-react";

interface Brand {
  id: string;
  name: string;
  shopify_domain: string;
  shopify_api_key?: string;
  shopify_access_token?: string;
  connected_at?: string;
  is_configured: boolean;
  is_active: boolean;
  last_sync_at?: string;
}

export default function BrandSettings() {
  const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:3002";
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    fetchBrands();

    // Check for OAuth callback messages
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") {
      setMessage({ type: "success", text: "Brand connected successfully!" });
      window.history.replaceState({}, "", "/settings/brands");
    } else if (params.get("error")) {
      setMessage({
        type: "error",
        text: "Failed to connect brand. Please try again.",
      });
      window.history.replaceState({}, "", "/settings/brands");
    }
  }, []);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .order("name");

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error("Failed to fetch brands", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (brand: Brand) => {
    if (!brand.shopify_api_key) {
      setMessage({ type: "error", text: "Please configure API key first" });
      return;
    }

    setConnecting(brand.id);

    try {
      const shopDomain =
        brand.shopify_domain || `${brand.name.toLowerCase()}.myshopify.com`;
      const { data } = await api.get("/api/shopify/auth", {
        params: {
          shop: shopDomain,
          brand_id: brand.id,
          response: "json",
        },
      });

      if (!data?.installUrl) {
        throw new Error("Install URL was not returned by backend");
      }

      window.location.href = data.installUrl;
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Failed to initiate connection",
      });
      setConnecting(null);
    }
  };

  const handleDisconnect = async (brandId: string) => {
    if (!confirm("Are you sure you want to disconnect this brand?")) {
      return;
    }

    try {
      await api.post(`/api/shopify/disconnect/${brandId}`);
      setMessage({ type: "success", text: "Brand disconnected successfully" });
      fetchBrands();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to disconnect",
      });
    }
  };

  const handleSync = async (brandId: string) => {
    try {
      setMessage({ type: "success", text: "Sync started..." });
      await api.post(`/api/inventory/sync-brand/${brandId}`);
      setMessage({ type: "success", text: "Sync completed successfully" });
      fetchBrands();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Sync failed",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Brand Settings</h1>
        <p className="mt-2 text-gray-600">
          Connect your Shopify stores to sync inventory
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 rounded-xl p-4 ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <p className="font-medium">{message.text}</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {brands.map((brand) => (
          <div
            key={brand.id}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {brand.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {brand.shopify_domain || "Not configured"}
                </p>
              </div>
              {brand.connected_at || brand.is_configured ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                  <XCircle className="w-4 h-4 mr-1" />
                  Not Connected
                </span>
              )}
            </div>

            {(brand.connected_at || brand.is_configured) && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">Connected:</span>
                  <span className="font-medium text-gray-900">
                    {brand.connected_at
                      ? new Date(brand.connected_at).toLocaleDateString()
                      : "Recently"}
                  </span>
                </div>
                {brand.last_sync_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Sync:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(brand.last_sync_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {brand.connected_at || brand.is_configured ? (
                <>
                  <button
                    onClick={() => handleSync(brand.id)}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync Now
                  </button>
                  <button
                    onClick={() => handleDisconnect(brand.id)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleConnect(brand)}
                  disabled={connecting === brand.id}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-medium disabled:opacity-50"
                >
                  {connecting === brand.id ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin h-4 w-4 mr-2"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Connecting...
                    </span>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4 mr-2" />
                      Connect to Shopify
                    </>
                  )}
                </button>
              )}
            </div>

            {!brand.shopify_api_key && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <Settings className="w-4 h-4 inline mr-1" />
                  Configure API key in database first
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          How to set up Shopify OAuth
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
          <li>Create a custom app in your Shopify store admin</li>
          <li>
            Add the required API scopes (read/write products, inventory, orders)
          </li>
          <li>
            Set the redirect URL to:{" "}
            <code className="bg-blue-100 px-2 py-1 rounded">
              {apiBaseUrl}/api/shopify/callback
            </code>
          </li>
          <li>Copy the Client ID and Client Secret</li>
          <li>Update the brand in database with api_key and api_secret</li>
          <li>Click "Connect to Shopify" button above</li>
        </ol>
      </div>
    </div>
  );
}
