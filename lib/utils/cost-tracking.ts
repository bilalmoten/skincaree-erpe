/**
 * Cost tracking utilities for calculating COGS, profit margins, etc.
 */

export interface ProductionCost {
  materialCost: number;
  totalCost: number;
}

export interface ProductCost {
  materialCost: number;
  productionCost: number;
  totalCost: number;
}

export interface SaleProfit {
  revenue: number;
  cogs: number;
  profit: number;
  profitMargin: number;
}

/**
 * Calculate production cost based on materials used
 */
export function calculateProductionCost(
  materialsUsed: Array<{ raw_material_id: string; quantity: number; last_price: number | null }>
): ProductionCost {
  const materialCost = materialsUsed.reduce((sum, material) => {
    const cost = material.quantity * (material.last_price || 0);
    return sum + cost;
  }, 0);

  return {
    materialCost,
    totalCost: materialCost, // Can add overhead later
  };
}

/**
 * Calculate COGS (Cost of Goods Sold) for a sale item
 */
export function calculateCOGS(
  productPrice: number,
  quantity: number,
  materialCostPerUnit: number
): SaleProfit {
  const revenue = productPrice * quantity;
  const cogs = materialCostPerUnit * quantity;
  const profit = revenue - cogs;
  const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    revenue,
    cogs,
    profit,
    profitMargin,
  };
}

/**
 * Calculate average cost for raw materials
 */
export function calculateAverageCost(
  purchases: Array<{ quantity: number; price: number }>
): number {
  if (purchases.length === 0) return 0;

  const totalCost = purchases.reduce((sum, p) => sum + (p.quantity * p.price), 0);
  const totalQuantity = purchases.reduce((sum, p) => sum + p.quantity, 0);

  return totalQuantity > 0 ? totalCost / totalQuantity : 0;
}

