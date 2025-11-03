const currencyFormatter = new Intl.NumberFormat('zh-SG', {
  style: 'currency',
  currency: 'SGD',
  maximumFractionDigits: 0
});

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1
});

export const formatCurrency = (value: number) => currencyFormatter.format(value);
export const formatTokens = (value: number) => `${numberFormatter.format(value / 1000)}k`;
export const formatHours = (value: number) => `${numberFormatter.format(value)}h`;
