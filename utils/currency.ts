export const DEFAULT_MONEY_LOCALE = 'en-US';

const ZERO_DECIMAL_CURRENCIES = new Set([
  'ALL',
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'ISK',
  'JPY',
  'KMF',
  'KRW',
  'PYG',
  'RWF',
  'UGX',
  'UYI',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

export const currencySymbol = (code: string | undefined): string => {
  switch (code) {
    case 'EUR':
      return '€';
    case 'USD':
      return '$';
    case 'GBP':
      return '£';
    default:
      return code ?? '';
  }
};

export const fractionDigitsFor = (code: string | undefined): number =>
  code && ZERO_DECIMAL_CURRENCIES.has(code.toUpperCase()) ? 0 : 2;

let currencyFormattingSupported: boolean | null = null;

export const supportsCurrencyFormatting = (): boolean => {
  if (currencyFormattingSupported !== null) return currencyFormattingSupported;

  try {
    const probe = new Intl.NumberFormat(DEFAULT_MONEY_LOCALE, {
      style: 'currency',
      currency: 'EUR',
    }).format(1);
    currencyFormattingSupported = /\d/.test(probe) && /[^\d\s.,]/.test(probe);
  } catch {
    currencyFormattingSupported = false;
  }

  return currencyFormattingSupported;
};

export const resetCurrencyFormattingProbe = (): void => {
  currencyFormattingSupported = null;
};

const toSafeAmount = (amount: number | null | undefined): number => {
  const value = Number(amount ?? 0);
  return Number.isFinite(value) ? value : 0;
};

const formatWithoutIntl = (amount: number, code: string | undefined, digits: number): string =>
  `${amount.toFixed(digits)} ${currencySymbol(code)}`.trim();

export const formatMoney = (
  amount: number | null | undefined,
  code: string | undefined,
  locale: string = DEFAULT_MONEY_LOCALE
): string => {
  const value = toSafeAmount(amount);
  const digits = fractionDigitsFor(code);

  if (!code) return formatWithoutIntl(value, code, digits);

  if (supportsCurrencyFormatting()) {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(value);
    } catch {
      return formatWithoutIntl(value, code, digits);
    }
  }

  return formatWithoutIntl(value, code, digits);
};
