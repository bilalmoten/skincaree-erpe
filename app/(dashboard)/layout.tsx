import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/dashboard" className="text-xl font-bold text-blue-600">
                  Skincare ERP
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-1">
                <Link
                  href="/dashboard"
                  className="text-gray-700 hover:bg-gray-100 hover:text-blue-600 inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/raw-materials"
                  className="text-gray-700 hover:bg-gray-100 hover:text-blue-600 inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Raw Materials
                </Link>
                <Link
                  href="/purchases"
                  className="text-gray-700 hover:bg-gray-100 hover:text-blue-600 inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Purchases
                </Link>
                <Link
                  href="/formulations"
                  className="text-gray-700 hover:bg-gray-100 hover:text-blue-600 inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Formulations
                </Link>
                <Link
                  href="/finished-products"
                  className="text-gray-700 hover:bg-gray-100 hover:text-blue-600 inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Finished Products
                </Link>
                <Link
                  href="/production"
                  className="text-gray-700 hover:bg-gray-100 hover:text-blue-600 inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Production
                </Link>
                <Link
                  href="/customers"
                  className="text-gray-700 hover:bg-gray-100 hover:text-blue-600 inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Customers
                </Link>
                <Link
                  href="/sales"
                  className="text-gray-700 hover:bg-gray-100 hover:text-blue-600 inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Sales
                </Link>
                <Link
                  href="/reports"
                  className="text-gray-700 hover:bg-gray-100 hover:text-blue-600 inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Reports
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="py-6">{children}</main>
    </div>
  );
}

