import { useState } from 'react';
import { Package, TrendingUp, FileText, Search, Plus, History, Bell, LogOut } from 'lucide-react';

// Mock data
const mockVariants = [
  {
    id: '1',
    title: 'Small / Red',
    sku: 'TET-001-SM-RED',
    price: 299.99,
    products: { title: 'ÙØ³ØªØ§Ù† Ø³Ù‡Ø±Ø© ÙØ§Ø®Ø±' },
    brands: { name: 'Tetiano' },
    inventory_levels: { available: 15 }
  },
  {
    id: '2',
    title: 'Medium / Blue',
    sku: 'TET-001-MD-BLUE',
    price: 299.99,
    products: { title: 'ÙØ³ØªØ§Ù† Ø³Ù‡Ø±Ø© ÙØ§Ø®Ø±' },
    brands: { name: 'Tetiano' },
    inventory_levels: { available: 8 }
  },
  {
    id: '3',
    title: 'Large / Black',
    sku: '98-002-LG-BLK',
    price: 199.99,
    products: { title: 'Ø¨Ù„ÙˆØ²Ø© ÙƒØ§Ø¬ÙˆØ§Ù„' },
    brands: { name: '98' },
    inventory_levels: { available: 23 }
  },
  {
    id: '4',
    title: 'One Size',
    sku: 'TET-003-OS',
    price: 149.99,
    products: { title: 'Ø¥ÙƒØ³Ø³ÙˆØ§Ø± ÙŠØ¯ÙˆÙŠ' },
    brands: { name: 'Tetiano' },
    inventory_levels: { available: 5 }
  },
  {
    id: '5',
    title: 'Small / White',
    sku: '98-004-SM-WHT',
    price: 179.99,
    products: { title: 'Ù‚Ù…ÙŠØµ Ø±Ø³Ù…ÙŠ' },
    brands: { name: '98' },
    inventory_levels: { available: 12 }
  }
];

const mockMovements = [
  {
    id: '1',
    delta: -3,
    previous_quantity: 18,
    new_quantity: 15,
    source: 'order',
    reason: 'Order #1234',
    created_at: '2024-02-28T10:30:00Z',
    user_profiles: { full_name: 'Ø£Ø­Ù…Ø¯ Ù…Ø­Ù…Ø¯' }
  },
  {
    id: '2',
    delta: 10,
    previous_quantity: 8,
    new_quantity: 18,
    source: 'manual',
    reason: 'Ø§Ø³ØªÙ„Ø§Ù… Ø´Ø­Ù†Ø© Ø¬Ø¯ÙŠØ¯Ø© Ù…Ù† Ø§Ù„Ù…ÙˆØ±Ø¯',
    created_at: '2024-02-27T14:20:00Z',
    user_profiles: { full_name: 'Ø³Ø§Ø±Ø© Ø¹Ù„ÙŠ' }
  },
  {
    id: '3',
    delta: -2,
    previous_quantity: 10,
    new_quantity: 8,
    source: 'manual',
    reason: 'Ù…Ù†ØªØ¬Ø§Øª ØªØ§Ù„ÙØ© - ØªÙ… Ø¥Ø²Ø§Ù„ØªÙ‡Ø§',
    created_at: '2024-02-26T09:15:00Z',
    user_profiles: { full_name: 'Ù…Ø­Ù…Ø¯ Ø­Ø³Ù†' }
  }
];

export default function Demo() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'reports'>('dashboard');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [adjustDelta, setAdjustDelta] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');

  const filteredVariants = mockVariants.filter(v => 
    v.sku.toLowerCase().includes(search.toLowerCase()) ||
    v.products.title.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    totalVariants: mockVariants.length,
    totalStock: mockVariants.reduce((sum, v) => sum + v.inventory_levels.available, 0),
    lowStock: mockVariants.filter(v => v.inventory_levels.available < 10).length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">
                  Ù†Ø¸Ø§Ù… Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø®Ø²ÙˆÙ† - Ø¹Ø±Ø¶ ØªØ¬Ø±ÙŠØ¨ÙŠ
                </h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`${
                    activeTab === 'dashboard'
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ…
                </button>
                <button
                  onClick={() => setActiveTab('inventory')}
                  className={`${
                    activeTab === 'inventory'
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  <Package className="w-4 h-4 ml-2" />
                  Ø§Ù„Ù…Ø®Ø²ÙˆÙ†
                </button>
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`${
                    activeTab === 'reports'
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  <FileText className="w-4 h-4 ml-2" />
                  Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ± Ø§Ù„ÙŠÙˆÙ…ÙŠØ©
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-400 hover:text-gray-500">
                <Bell className="w-6 h-6" />
                <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  3
                </span>
              </button>
              <div className="text-sm text-gray-700">demo@example.com</div>
              <button className="p-2 text-gray-400 hover:text-gray-500">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="px-4 sm:px-0">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ…</h1>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Package className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="mr-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats.totalVariants}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <TrendingUp className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="mr-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø®Ø²ÙˆÙ†
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats.totalStock}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Package className="h-6 w-6 text-red-400" />
                    </div>
                    <div className="mr-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Ù…Ù†ØªØ¬Ø§Øª Ù‚Ù„ÙŠÙ„Ø© Ø§Ù„Ù…Ø®Ø²ÙˆÙ†
                        </dt>
                        <dd className="text-lg font-medium text-red-600">
                          {stats.lowStock}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª Ø³Ø±ÙŠØ¹Ø©
              </h2>
              <div className="space-y-3">
                <button
                  onClick={() => setActiveTab('inventory')}
                  className="block w-full px-4 py-3 bg-indigo-50 hover:bg-indigo-100 rounded-md text-indigo-700 font-medium text-right"
                >
                  Ø¹Ø±Ø¶ Ø§Ù„Ù…Ø®Ø²ÙˆÙ†
                </button>
                <button
                  onClick={() => setActiveTab('reports')}
                  className="block w-full px-4 py-3 bg-indigo-50 hover:bg-indigo-100 rounded-md text-indigo-700 font-medium text-right"
                >
                  Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø§Ù„ÙŠÙˆÙ…ÙŠ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inventory */}
        {activeTab === 'inventory' && (
          <div className="px-4 sm:px-0">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Ø§Ù„Ù…Ø®Ø²ÙˆÙ†</h1>

            <div className="mb-4">
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="block w-full pr-10 pl-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Ø§Ø¨Ø­Ø« Ø¨Ø§Ù„Ù€ SKU Ø£Ùˆ Ø§Ø³Ù… Ø§Ù„Ù…Ù†ØªØ¬..."
                  dir="rtl"
                />
              </div>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {filteredVariants.map((variant) => (
                  <li key={variant.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 space-x-reverse">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {variant.brands.name}
                          </span>
                          <h3 className="text-sm font-medium text-gray-900">
                            {variant.products.title}
                          </h3>
                        </div>
                        <div className="mt-1 flex items-center space-x-4 space-x-reverse text-sm text-gray-500">
                          <span>{variant.title}</span>
                          <span>SKU: {variant.sku}</span>
                          <span>{variant.price} Ø¬Ù†ÙŠÙ‡</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 space-x-reverse">
                        <div className="text-left">
                          <div className="text-sm font-medium text-gray-900">
                            Ø§Ù„Ù…Ø®Ø²ÙˆÙ†: {variant.inventory_levels.available}
                          </div>
                          {variant.inventory_levels.available < 10 && (
                            <div className="text-xs text-red-600">Ù…Ø®Ø²ÙˆÙ† Ù‚Ù„ÙŠÙ„</div>
                          )}
                        </div>
                        <div className="flex space-x-2 space-x-reverse">
                          <button
                            onClick={() => {
                              setSelectedVariant(variant);
                              setShowLedgerModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600"
                            title="Ø¹Ø±Ø¶ Ø§Ù„Ø³Ø¬Ù„"
                          >
                            <History className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedVariant(variant);
                              setShowAdjustModal(true);
                            }}
                            className="p-2 text-indigo-600 hover:text-indigo-800"
                            title="ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…Ø®Ø²ÙˆÙ†"
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
          </div>
        )}

        {/* Daily Reports */}
        {activeTab === 'reports' && (
          <div className="px-4 sm:px-0">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø§Ù„ÙŠÙˆÙ…ÙŠ</h1>

            <div className="bg-green-50 mb-6 rounded-md p-4">
              <p className="text-sm font-medium text-green-800">
                âœ“ ØªÙ… Ø¥Ø±Ø³Ø§Ù„ ØªÙ‚Ø±ÙŠØ± Ø§Ù„ÙŠÙˆÙ…
              </p>
            </div>

            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <form className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 text-right">
                      Ù…Ø§Ø°Ø§ Ø£Ù†Ø¬Ø²Øª Ø§Ù„ÙŠÙˆÙ…ØŸ *
                    </label>
                    <textarea
                      rows={4}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Ø§Ø°ÙƒØ± Ø¥Ù†Ø¬Ø§Ø²Ø§ØªÙƒ ÙˆØ§Ù„Ù…Ù‡Ø§Ù… Ø§Ù„Ù…ÙƒØªÙ…Ù„Ø©..."
                      dir="rtl"
                      defaultValue="- ØªÙ… Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ù…Ø®Ø²ÙˆÙ† Ù„Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª&#10;- Ù…Ø¹Ø§Ù„Ø¬Ø© 15 Ø·Ù„Ø¨ Ø¬Ø¯ÙŠØ¯&#10;- ØªØ­Ø¯ÙŠØ« Ø£Ø³Ø¹Ø§Ø± Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª Ø§Ù„Ù…ÙˆØ³Ù…ÙŠØ©"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 text-right">
                      Ù‡Ù„ ÙˆØ§Ø¬Ù‡Øª Ø£ÙŠ Ø¹ÙˆØ§Ø¦Ù‚ØŸ
                    </label>
                    <textarea
                      rows={3}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Ø§Ø°ÙƒØ± Ø£ÙŠ Ù…Ø´Ø§ÙƒÙ„ Ø£Ùˆ ØªØ­Ø¯ÙŠØ§Øª..."
                      dir="rtl"
                      defaultValue="ØªØ£Ø®Ø± ÙÙŠ Ø´Ø­Ù†Ø© Ø§Ù„Ù…ÙˆØ±Ø¯ - Ù…ØªÙˆÙ‚Ø¹ Ø§Ù„ÙˆØµÙˆÙ„ ØºØ¯Ù‹Ø§"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 text-right">
                      Ù…Ø§ Ù‡ÙŠ Ø®Ø·ØªÙƒ Ù„ØºØ¯Ù‹Ø§ØŸ *
                    </label>
                    <textarea
                      rows={4}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Ø­Ø¯Ø¯ Ø£Ù‡Ø¯Ø§ÙÙƒ ÙˆÙ…Ù‡Ø§Ù…Ùƒ Ù„ØºØ¯Ù‹Ø§..."
                      dir="rtl"
                      defaultValue="- Ø§Ø³ØªÙ„Ø§Ù… Ø§Ù„Ø´Ø­Ù†Ø© Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø© ÙˆØªØ­Ø¯ÙŠØ« Ø§Ù„Ù…Ø®Ø²ÙˆÙ†&#10;- Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø·Ù„Ø¨Ø§Øª Ø§Ù„Ù…Ø¹Ù„Ù‚Ø©&#10;- Ø¥Ø¹Ø¯Ø§Ø¯ ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ÙŠ"
                    />
                  </div>

                  <div className="flex justify-start">
                    <button
                      type="button"
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      ØªØ­Ø¯ÙŠØ« Ø§Ù„ØªÙ‚Ø±ÙŠØ±
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Adjust Modal */}
      {showAdjustModal && selectedVariant && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowAdjustModal(false)} />

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…Ø®Ø²ÙˆÙ†
              </h3>

              <div className="mb-4 p-4 bg-gray-50 rounded-md">
                <div className="text-sm text-gray-600">
                  <div className="font-medium">{selectedVariant.products.title}</div>
                  <div>{selectedVariant.title}</div>
                  <div className="mt-2">
                    Ø§Ù„Ù…Ø®Ø²ÙˆÙ† Ø§Ù„Ø­Ø§Ù„ÙŠ: <span className="font-semibold">{selectedVariant.inventory_levels.available}</span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ø§Ù„ØªØ¹Ø¯ÙŠÙ„
                </label>
                <input
                  type="number"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(parseInt(e.target.value) || 0)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Ø£Ø¯Ø®Ù„ Ø±Ù‚Ù… Ù…ÙˆØ¬Ø¨ Ø£Ùˆ Ø³Ø§Ù„Ø¨"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Ø§Ù„Ù…Ø®Ø²ÙˆÙ† Ø§Ù„Ø¬Ø¯ÙŠØ¯ Ø³ÙŠÙƒÙˆÙ†: <span className="font-semibold">{selectedVariant.inventory_levels.available + adjustDelta}</span>
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ø§Ù„Ø³Ø¨Ø¨ *
                </label>
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Ø§Ø´Ø±Ø­ Ø³Ø¨Ø¨ ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…Ø®Ø²ÙˆÙ†..."
                  dir="rtl"
                />
              </div>

              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => {
                    alert('ØªÙ… ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…Ø®Ø²ÙˆÙ† Ø¨Ù†Ø¬Ø§Ø­! (Ø¹Ø±Ø¶ ØªØ¬Ø±ÙŠØ¨ÙŠ)');
                    setShowAdjustModal(false);
                    setAdjustDelta(0);
                    setAdjustReason('');
                  }}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…Ø®Ø²ÙˆÙ†
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAdjustModal(false);
                    setAdjustDelta(0);
                    setAdjustReason('');
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Ø¥Ù„ØºØ§Ø¡
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Modal */}
      {showLedgerModal && selectedVariant && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowLedgerModal(false)} />

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Ø³Ø¬Ù„ Ø­Ø±ÙƒØ§Øª Ø§Ù„Ù…Ø®Ø²ÙˆÙ†
              </h3>

              <div className="mb-4 p-4 bg-gray-50 rounded-md">
                <div className="text-sm text-gray-600">
                  <div className="font-medium">{selectedVariant.products.title}</div>
                  <div>{selectedVariant.title}</div>
                  <div className="mt-2">
                    Ø§Ù„Ù…Ø®Ø²ÙˆÙ† Ø§Ù„Ø­Ø§Ù„ÙŠ: <span className="font-semibold">{selectedVariant.inventory_levels.available}</span>
                  </div>
                </div>
              </div>

              <div className="overflow-y-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ø§Ù„ØªØ§Ø±ÙŠØ®</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ø§Ù„Ù…ØµØ¯Ø±</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ø§Ù„ØªØºÙŠÙŠØ±</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ù‚Ø¨Ù„ â† Ø¨Ø¹Ø¯</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ø§Ù„Ø³Ø¨Ø¨</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mockMovements.map((movement) => (
                      <tr key={movement.id}>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(movement.created_at).toLocaleDateString('ar-EG')}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            movement.source === 'manual' ? 'bg-blue-100 text-blue-800' :
                            movement.source === 'order' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {movement.source === 'manual' ? 'ÙŠØ¯ÙˆÙŠ' : movement.source === 'order' ? 'Ø·Ù„Ø¨' : movement.source}
                          </span>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm">
                          <span className={movement.delta > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            {movement.delta > 0 ? '+' : ''}{movement.delta}
                          </span>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                          {movement.previous_quantity} â† {movement.new_quantity}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500 max-w-xs">
                          {movement.reason}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                          {movement.user_profiles.full_name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => setShowLedgerModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:text-sm"
                >
                  Ø¥ØºÙ„Ø§Ù‚
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

