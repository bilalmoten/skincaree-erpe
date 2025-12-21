import jsPDF from 'jspdf';

export function generateSalesInvoicePDF(sale: any) {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(20);
  doc.text('Sales Invoice', 20, 20);

  // Sale details
  doc.setFontSize(11);
  let y = 50;
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Details', 20, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice #: ${sale.id.slice(0, 8).toUpperCase()}`, 20, y);
  y += 6;
  doc.text(`Date: ${new Date(sale.sale_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 20, y);
  y += 6;
  doc.text(`Customer: ${sale.customers?.name || 'Walk-in Customer'}`, 20, y);
  y += 6;
  if (sale.is_cash_paid) {
    doc.setTextColor(0, 128, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('✓ Payment: Cash Paid', 20, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
  }
  y += 12;

  // Calculate subtotal and discount
  const subtotal = sale.subtotal || sale.sales_items?.reduce((sum: number, item: any) => sum + item.subtotal, 0) || sale.total_amount;
  const discountAmount = sale.discount_amount || 0;

  // Items table header
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Items', 20, y);
  y += 8;

  // Table header background
  doc.setFillColor(249, 250, 251); // Light gray
  doc.rect(20, y - 5, 170, 8, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Product', 22, y);
  doc.text('Qty', 110, y);
  doc.text('Price', 135, y);
  doc.text('Subtotal', 170, y, { align: 'right' });
  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, 190, y);
  y += 8;

  // Items
  doc.setFont('helvetica', 'normal');
  sale.sales_items?.forEach((item: any, index: number) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(9);
    doc.text(item.finished_products?.name || 'Unknown', 22, y);
    doc.text(item.quantity.toString(), 110, y);
    doc.text(`PKR ${item.unit_price.toFixed(2)}`, 135, y);
    doc.text(`PKR ${item.subtotal.toFixed(2)}`, 190, y, { align: 'right' });

    // Alternate row background
    if (index % 2 === 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(20, y - 4, 170, 6, 'F');
      doc.setTextColor(0, 0, 0);
    }

    y += 7;
  });

  y += 5;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, 190, y);
  y += 10;

  // Subtotal
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', 150, y);
  doc.text(`PKR ${subtotal.toFixed(2)}`, 190, y, { align: 'right' });
  y += 7;

  // Discount
  if (discountAmount > 0) {
    const discountType = sale.discount_type === 'percentage' ? '%' : 'PKR';
    const discountValue = sale.discount_value || 0;
    doc.setTextColor(220, 38, 38);
    doc.text(`Discount (${sale.discount_type === 'percentage' ? `${discountValue}%` : `PKR ${discountValue.toFixed(2)}`}):`, 150, y);
    doc.text(`- PKR ${discountAmount.toFixed(2)}`, 190, y, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 7;
  }

  // Total
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.5);
  doc.line(20, y, 190, y);
  y += 8;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Amount:', 150, y);
  doc.setFillColor(59, 130, 246);
  doc.setTextColor(255, 255, 255);
  doc.rect(150, y - 6, 40, 8, 'F');
  doc.text(`PKR ${sale.total_amount.toFixed(2)}`, 190, y, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  // Notes
  if (sale.notes) {
    y += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Notes:', 20, y);
    y += 7;
    const splitNotes = doc.splitTextToSize(sale.notes, 170);
    doc.text(splitNotes, 20, y);
  }

  return doc;
}

export function generateProductionRunPDF(run: any) {
  const doc = new jsPDF();

  // Header
  doc.setFillColor(34, 197, 94); // Green
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('PRODUCTION RUN', 105, 25, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  let y = 50;

  doc.setFont('helvetica', 'bold');
  doc.text('Production Details', 20, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`Run ID: ${run.id.slice(0, 8).toUpperCase()}`, 20, y);
  y += 6;
  doc.text(`Formulation: ${run.formulations?.name || 'Unknown'}`, 20, y);
  y += 6;
  doc.text(`Batch Size: ${run.batch_size} ${run.formulations?.batch_unit || 'kg'}`, 20, y);
  y += 6;
  doc.text(`Production Date: ${new Date(run.production_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 20, y);
  y += 10;

  // Materials Used
  doc.setFont('helvetica', 'bold');
  doc.text('Materials Used:', 20, y);
  y += 8;
  doc.setFillColor(249, 250, 251);
  doc.rect(20, y - 5, 170, 8, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Material', 22, y);
  doc.text('Quantity', 120, y);
  doc.text('Unit', 170, y);
  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, 190, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  run.production_materials_used?.forEach((mat: any, index: number) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.text(mat.raw_materials?.name || 'Unknown', 22, y);
    doc.text(mat.quantity_used.toFixed(3), 120, y);
    doc.text(mat.raw_materials?.unit || '', 170, y);
    y += 7;
  });

  y += 5;
  doc.line(20, y, 190, y);
  y += 10;

  // Finished Products
  if (run.finished_products_produced && run.finished_products_produced.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Finished Products Produced:', 20, y);
    y += 8;
    doc.setFillColor(249, 250, 251);
    doc.rect(20, y - 5, 170, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Product', 22, y);
    doc.text('Quantity', 170, y, { align: 'right' });
    y += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, y, 190, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    run.finished_products_produced.forEach((product: any) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.text(product.name, 22, y);
      doc.text(`${product.quantity_produced} units`, 190, y, { align: 'right' });
      y += 7;
    });
  }

  if (run.notes) {
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Notes:', 20, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const splitNotes = doc.splitTextToSize(run.notes, 170);
    doc.text(splitNotes, 20, y);
  }

  return doc;
}

export function generateLedgerPDF(customer: any, ledger: any[]) {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(20);
  doc.text('Customer Ledger', 20, 20);

  // Customer details
  doc.setFontSize(12);
  let y = 35;
  doc.text(`Customer: ${customer.name}`, 20, y);
  y += 7;
  if (customer.email) {
    doc.text(`Email: ${customer.email}`, 20, y);
    y += 7;
  }
  if (customer.phone) {
    doc.text(`Phone: ${customer.phone}`, 20, y);
    y += 7;
  }
  y += 7;

  // Ledger table header
  doc.setFontSize(10);
  doc.text('Transaction History:', 20, y);
  y += 7;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, 190, y);
  y += 5;

  doc.setFontSize(9);
  doc.text('Date', 20, y);
  doc.text('Type', 60, y);
  doc.text('Description', 90, y);
  doc.text('Amount', 140, y);
  doc.text('Balance', 170, y);
  y += 5;
  doc.line(20, y, 190, y);
  y += 7;

  // Ledger entries
  ledger.forEach((entry) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    doc.text(new Date(entry.transaction_date).toLocaleDateString(), 20, y);
    doc.text(entry.transaction_type || 'Payment', 60, y);

    const description = entry.description || (entry.sale_id ? `Sale #${entry.sale_id?.slice(0, 8)}` : 'Payment');
    doc.text(description.length > 20 ? description.substring(0, 20) + '...' : description, 90, y);

    const amount = entry.amount || 0;
    const amountText = entry.transaction_type === 'payment' ? `-PKR ${Math.abs(amount).toFixed(2)}` : `PKR ${amount.toFixed(2)}`;
    doc.text(amountText, 140, y);
    doc.text(`PKR ${entry.balance.toFixed(2)}`, 170, y);
    y += 7;
  });

  // Final balance
  if (ledger.length > 0) {
    y += 5;
    doc.line(20, y, 190, y);
    y += 7;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    const finalBalance = ledger[ledger.length - 1]?.balance || 0;
    doc.text('Current Balance:', 140, y);
    doc.text(`PKR ${finalBalance.toFixed(2)}`, 170, y);
  }

  return doc;
}

export function generateReportPDF(title: string, data: any, type: 'sales' | 'inventory' | 'production') {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text(title, 20, 20);

  doc.setFontSize(12);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 35);

  let y = 50;
  doc.setFontSize(10);

  if (type === 'sales' && data.summary) {
    doc.text(`Total Sales: ${data.summary.totalSales}`, 20, y);
    y += 7;
    doc.text(`Total Revenue: PKR ${data.summary.totalRevenue.toFixed(2)}`, 20, y);
    y += 7;
    doc.text(`Total Items Sold: ${data.summary.totalItems}`, 20, y);
  } else if (type === 'inventory' && data.summary) {
    doc.text(`Raw Materials Value: PKR ${data.summary.rawMaterialsValue.toFixed(2)}`, 20, y);
    y += 7;
    doc.text(`Finished Products Value: PKR ${data.summary.finishedProductsValue.toFixed(2)}`, 20, y);
  } else if (type === 'production' && data.summary) {
    doc.text(`Total Production Runs: ${data.summary.totalRuns}`, 20, y);
    y += 7;
    doc.text(`Total Batch Size: ${data.summary.totalBatchSize.toFixed(2)}`, 20, y);
  }

  return doc;
}

