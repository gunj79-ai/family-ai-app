export const estimateTokens = (text: string): number =>
  Math.ceil(text.length / 4);

export const formatTokens = (n: number): string =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
