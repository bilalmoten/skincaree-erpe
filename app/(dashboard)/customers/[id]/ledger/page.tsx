'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';

interface Customer {
  id: string;
  name: string;
}

interface LedgerEntry {
  id: string;
  transaction_type: 'sale' | 'payment';
  amount: number;
  balance: number;
  transaction_date: string;
  notes: string | null;
  sales: {
    sale_date: string;
    total_amount: number;
  } | null;
}

export default function CustomerLedgerPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    if (customerId) {
      fetchCustomer();
      fetchLedger();
    }
  }, [customerId]);

  const fetchCustomer = async () => {
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      const data = await res.json();
      setCustomer(data);
    } catch (error) {
      console.error('Error fetching customer:', error);
    }
  };

  const fetchLedger = async () => {
    try {
      const res = await fetch(`/api/customer-ledger/${customerId}`);
      const data = await res.json();
      setLedger(data);
    } catch (error) {
      console.error('Error fetching ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch(`/api/customer-ledger/${customerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: paymentData.amount,
          transaction_date: paymentData.transaction_date,
          notes: paymentData.notes,
        }),
      });

      if (res.ok) {
        alert('Payment recorded successfully!');
        setShowPaymentForm(false);
        setPaymentData({
          amount: '',
          transaction_date: new Date().toISOString().split('T')[0],
          notes: '',
        });
        fetchLedger();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert('Failed to record payment');
    }
  };

  const currentBalance = ledger.length > 0 ? ledger[0].balance : 0;

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">{customer?.name} - Ledger</h1>
            <button
              onClick={async () => {
                try {
                  const { generateLedgerPDF } = await import('@/lib/pdf/utils');
                  const doc = generateLedgerPDF(customer, ledger);
                  doc.save(`ledger-${customer?.name}-${new Date().toISOString().split('T')[0]}.pdf`);
                } catch (error) {
                  console.error('Error generating PDF:', error);
                  alert('Failed to generate PDF');
                }
              }}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Export PDF
            </button>
          </div>
          <p className="text-lg mt-2">
            Current Balance: <span className={`font-bold ${currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              PKR {Math.abs(currentBalance).toFixed(2)} {currentBalance > 0 ? '(Owed)' : '(Credit)'}
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowPaymentForm(!showPaymentForm)}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Record Payment
        </button>
      </div>

      {showPaymentForm && (
        <div className="mb-6 p-4 bg-white border rounded">
          <h2 className="font-semibold mb-4">Record Payment</h2>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Amount *</label>
              <input
                type="number"
                step="0.01"
                required
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Payment Date *</label>
              <input
                type="date"
                required
                value={paymentData.transaction_date}
                onChange={(e) => setPaymentData({ ...paymentData, transaction_date: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                className="w-full border rounded px-3 py-2"
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Record Payment
              </button>
              <button
                type="button"
                onClick={() => setShowPaymentForm(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-[var(--surface-muted)]">
              <th className="px-4 py-2 text-left border">Date</th>
              <th className="px-4 py-2 text-left border">Type</th>
              <th className="px-4 py-2 text-left border">Amount</th>
              <th className="px-4 py-2 text-left border">Balance</th>
              <th className="px-4 py-2 text-left border">Notes</th>
            </tr>
          </thead>
          <tbody>
            {ledger.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No ledger entries found.
                </td>
              </tr>
            ) : (
              ledger.map((entry) => (
                <tr key={entry.id} className="hover:bg-[var(--surface-muted)]">
                  <td className="px-4 py-2 border">
                    {format(new Date(entry.transaction_date), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-4 py-2 border">
                    <span className={`px-2 py-1 rounded text-xs ${
                      entry.transaction_type === 'sale' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {entry.transaction_type === 'sale' ? 'Sale' : 'Payment'}
                    </span>
                  </td>
                  <td className={`px-4 py-2 border ${
                    entry.transaction_type === 'sale' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {entry.transaction_type === 'sale' ? '+' : '-'}PKR {entry.amount.toFixed(2)}
                  </td>
                  <td className={`px-4 py-2 border font-semibold ${
                    entry.balance > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    PKR {Math.abs(entry.balance).toFixed(2)} {entry.balance > 0 ? '(Owed)' : '(Credit)'}
                  </td>
                  <td className="px-4 py-2 border">{entry.notes || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
