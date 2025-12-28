'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useToast } from '@/components/ToastProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

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
  const { showToast } = useToast();

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
          amount: parseFloat(paymentData.amount),
          transaction_date: paymentData.transaction_date,
          notes: paymentData.notes,
        }),
      });

      if (res.ok) {
        showToast('Payment recorded successfully!', 'success');
        setShowPaymentForm(false);
        setPaymentData({
          amount: '',
          transaction_date: new Date().toISOString().split('T')[0],
          notes: '',
        });
        fetchLedger();
      } else {
        const error = await res.json();
        showToast(`Error: ${error.error}`, 'error');
      }
    } catch (error) {
      showToast('Failed to record payment', 'error');
    }
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Loading...</div>;
  if (!customer) return <div className="p-6 text-center">Customer not found</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{customer.name}</h1>
          <p className="text-muted-foreground">Customer Ledger</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={async () => {
              try {
                const { generateLedgerPDF } = await import('@/lib/pdf/utils');
                const doc = generateLedgerPDF(customer, ledger);
                doc.save(`ledger-${customer.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
              } catch (error) {
                console.error('Error generating ledger PDF:', error);
                showToast('Failed to generate ledger PDF', 'error');
              }
            }}
            variant="outline"
            className="bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-white"
          >
            📄 Print Ledger
          </Button>
          <Button onClick={() => setShowPaymentForm(!showPaymentForm)}>
            {showPaymentForm ? 'Cancel Payment' : '+ Record Payment'}
          </Button>
        </div>
      </div>

      {showPaymentForm && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Record Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Payment Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    required
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="date">Payment Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    required
                    value={paymentData.transaction_date}
                    onChange={(e) => setPaymentData({ ...paymentData, transaction_date: e.target.value })}
                    className="mt-2"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  className="mt-2"
                  rows={2}
                />
              </div>
              <Button type="submit">Submit Payment</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Debit (+)</TableHead>
                <TableHead className="text-right">Credit (-)</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(entry.transaction_date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.transaction_type === 'sale' ? 'outline' : 'secondary'}>
                      {entry.transaction_type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {entry.notes || '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {entry.transaction_type === 'sale' ? `PKR ${entry.amount.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium text-[hsl(var(--success))]">
                    {entry.transaction_type === 'payment' ? `PKR ${entry.amount.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    PKR {entry.balance.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              {ledger.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">
                    No transactions found for this customer.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
