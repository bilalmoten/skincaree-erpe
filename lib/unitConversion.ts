export const normalizeUnit = (unit?: string) => (unit ?? '').trim().toLowerCase();

const conversionMatrix: Record<string, Record<string, number>> = {
  kg: { g: 1000 },
  g: { kg: 1 / 1000 },
  l: { ml: 1000 },
  ml: { l: 1 / 1000 },
};

export const convertBetweenUnits = (value: number, fromUnit?: string, toUnit?: string) => {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);
  if (!from || !to || from === to) return value;
  const rate = conversionMatrix[from]?.[to];
  if (rate !== undefined) {
    return value * rate;
  }
  return value;
};

export const convertToBatchUnit = (value: number, ingredientUnit: string, batchUnit: string) => {
  return convertBetweenUnits(value, ingredientUnit, batchUnit);
};

export const convertFromBatchUnit = (value: number, batchUnit: string, ingredientUnit: string) => {
  return convertBetweenUnits(value, batchUnit, ingredientUnit);
};

