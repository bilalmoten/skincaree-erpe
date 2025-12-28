'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  cell: (item: T) => ReactNode;
  mobileLabel?: string;
  hideOnMobile?: boolean;
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  emptyState?: ReactNode;
}

export default function ResponsiveTable<T extends { id?: string }>({
  columns,
  data,
  emptyMessage = 'No items found.',
  emptyState,
}: ResponsiveTableProps<T>) {
  if (data.length === 0) {
    return emptyState || (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column.key}>{column.header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item, index) => (
                  <TableRow key={item.id || index}>
                    {columns.map((column) => (
                      <TableCell key={column.key}>{column.cell(item)}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {data.map((item, index) => (
          <Card key={item.id || index} className="hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="space-y-3">
                {columns
                  .filter((col) => !col.hideOnMobile)
                  .map((column) => (
                    <div key={column.key} className="flex justify-between items-start gap-4">
                      <span className="text-sm font-medium text-muted-foreground min-w-[100px]">
                        {column.mobileLabel || column.header}:
                      </span>
                      <div className="text-sm text-foreground text-right flex-1">
                        {column.cell(item)}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}


