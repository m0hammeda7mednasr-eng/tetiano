import { useState } from 'react';
import { Search, Plus, History } from 'lucide-react';

// Sample data for demo
const sampleVariants = [
  {
    id: '1',
    title: 'Small / Red',
    sku: 'TET-001-SM-RED',
    price: 299.99,
    products: { title: 'Premium Cotton T-Shirt' },
    brands: { name: 'Tetiano' },
    inventory_levels: { available: 45 },
  },
  {
    id: '2',
    title: 'Medium / Blue',
    sku: 'TET-001-MD-BLUE',
    price: 299.99,
    products: { title: 'Premium Cotton T-Shirt' },
    brands: { name: 'Tetiano' },
    inventory_levels: { available: 8 },
  },
  {
    id: '3',
    title: 'Large / Black',
    sku: 'TET-001-LG-BLK',
    price: 299.99,
    products: { title: 'Premium Cotton T-Shirt' },
    brands: { name: 'Tetiano' },
    inventory_levels: { available: 120 },
  },
  {
    id: '4',
    title: 'One Size',
    sku: '98-CAP-001',
    price: 149.99,
    products: { title: 'Baseball Cap' },
    brands: { name: '98' },
    inventory_levels: { available: 5 },
  },
  {
    id: '5',
    title: 'Small',
    sku: '98-SOCK-001-SM',
    price: 79.99,
    products: { title: 'Athletic Socks' },
    brands: { name: '98' },
    inventory_levels: { available: 200 },
  },
];

export default function DemoInventory() {
  const [search, setSearch] = useState('');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);

  const filteredVariants = sampleVariants.filter(
    (v) =>
      v.sku.toLowerCase().includes(search.toLowerCase()) ||
      v.title.toLowerCase().includes(search.toLowerCase()) ||
      v.products.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Inventory Manager - Demo
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                Demo Mode
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="sm:flex sm:items-center sm:justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Inventory</h2>
          </div>

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Search by SKU, title, or barcode..."
              />
            </div>
          </div>

          {/* Inventory List */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {filteredVariants.map((variant) => (
                <li key={variant.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            variant.brands.name === 'Tetiano'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {variant.brands.name}
                        </span>
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {variant.products.title}
                        </h3>
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <span>{variant.title}</span>
                        <span>SKU: {variant.sku}</span>
                        <span>{variant.price.toFixed(2)} EGP</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          Stock: {variant.inventory_levels.available}
                        </div>
                        {variant.inventory_levels.available < 10 && (
                          <div className="text-xs text-red-600 font-medium">
                            Low stock!
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedVariant(variant);
                            setShowLedgerModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                          title="View ledger"
                        >
                          <History className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedVariant(variant);
                            setShowAdjustModal(true);
                          }}
                          className="p-2 text-indigo-600 hover:text-indigo-800 transition-colors"
                          title="Adjust stock"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Demo Notice */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">
              📋 Demo Mode - Sample Data
            </h3>
            <p className="text-sm text-blue-700">
              This is a demo showing the UI design. To use the full system with real data:
            </p>
            <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
              <li>Set up Supabase account and add credentials</li>
              <li>Run database migrations</li>
              <li>Start the backend server</li>
              <li>Configure Shopify webhooks</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Adjust Modal */}
      {showAdjustModal && selectedVariant && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowAdjustModal(false)}
            />

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Adjust Stock - Demo
                </h3>

                <div className="mb-4 p-4 bg-gray-50 rounded-md">
                  <div className="text-sm text-gray-600">
                    <div className="font-medium">{selectedVariant.products.title}</div>
                    <div>{selectedVariant.title}</div>
                    <div className="mt-2">
                      Current Stock:{' '}
                      <span className="font-semibold">
                        {selectedVariant.inventory_levels.available}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    This is a demo. In the full version, you can adjust stock levels and
                    they will sync with Shopify.
                  </p>
                </div>

                <div className="mt-5 sm:mt-4">
                  <button
                    type="button"
                    onClick={() => setShowAdjustModal(false)}
                    className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Modal */}
      {showLedgerModal && selectedVariant && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowLedgerModal(false)}
            />

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full sm:p-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Stock Movement Ledger - Demo
                </h3>

                <div className="mb-4 p-4 bg-gray-50 rounded-md">
                  <div className="text-sm text-gray-600">
                    <div className="font-medium">{selectedVariant.products.title}</div>
                    <div>{selectedVariant.title}</div>
                  </div>
                </div>

                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    This is a demo. In the full version, you'll see a complete audit trail
                    of all stock movements with timestamps, users, and reasons.
                  </p>
                </div>

                <div className="mt-5 sm:mt-4">
                  <button
                    type="button"
                    onClick={() => setShowLedgerModal(false)}
                    className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
