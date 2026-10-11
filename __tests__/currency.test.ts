import {
  DEFAULT_MONEY_LOCALE,
  currencySymbol,
  formatMoney,
  fractionDigitsFor,
  resetCurrencyFormattingProbe,
  supportsCurrencyFormatting,
} from '@/utils/currency';

const hasIntl = (() => {
  try {
    return (
      typeof Intl !== 'undefined' &&
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' })
        .format(1)
        .includes('€')
    );
  } catch {
    return false;
  }
})();

beforeEach(() => {
  resetCurrencyFormattingProbe();
});

describe('how many decimals a currency gets', () => {
  it('gives the usual currencies two', () => {
    expect(fractionDigitsFor('EUR')).toBe(2);
    expect(fractionDigitsFor('USD')).toBe(2);
    expect(fractionDigitsFor('GBP')).toBe(2);
  });

  it('gives the whole unit currencies none', () => {
    expect(fractionDigitsFor('ALL')).toBe(0);
    expect(fractionDigitsFor('JPY')).toBe(0);
    expect(fractionDigitsFor('ISK')).toBe(0);
    expect(fractionDigitsFor('KRW')).toBe(0);
  });

  it('reads a lower case code the same way', () => {
    expect(fractionDigitsFor('all')).toBe(0);
    expect(fractionDigitsFor('eur')).toBe(2);
  });

  it('falls back to two for an unknown or missing code', () => {
    expect(fractionDigitsFor('XYZ')).toBe(2);
    expect(fractionDigitsFor(undefined)).toBe(2);
  });

  it('agrees with the platform currency data', () => {
    if (!hasIntl) return;

    ['ALL', 'JPY', 'ISK', 'KRW', 'VND', 'XOF', 'EUR', 'USD', 'GBP'].forEach((code) => {
      const resolved = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: code,
      }).resolvedOptions().maximumFractionDigits;

      expect(fractionDigitsFor(code)).toBe(resolved);
    });
  });
});

describe('formatting an amount', () => {
  it('formats euros for the default locale', () => {
    const result = formatMoney(1234.5, 'EUR');

    expect(result).toContain('€');
    expect(result).toContain('1,234.50');
  });

  it('formats dollars', () => {
    const result = formatMoney(9.9, 'USD');

    expect(result).toContain('$');
    expect(result).toContain('9.90');
  });

  it('formats lek without decimals', () => {
    const result = formatMoney(1234.5, 'ALL');

    expect(result).toContain('ALL');
    expect(result).not.toContain('.50');
    expect(result).toContain('1,235');
  });

  it('keeps a whole unit currency whole even for a round amount', () => {
    expect(formatMoney(1200, 'ALL')).not.toContain('.00');
  });

  it('honours a different locale', () => {
    if (!hasIntl) return;

    const german = formatMoney(1234.5, 'EUR', 'de-DE');

    expect(german).toContain('1.234,50');
    expect(german).not.toBe(formatMoney(1234.5, 'EUR', DEFAULT_MONEY_LOCALE));
  });

  it('falls back to the plain format without a currency code', () => {
    expect(formatMoney(12.5, undefined)).toBe('12.50');
  });

  it('treats a missing amount as nothing owed', () => {
    expect(formatMoney(null, 'EUR')).toContain('0.00');
    expect(formatMoney(undefined, 'EUR')).toContain('0.00');
    expect(formatMoney(null, undefined)).toBe('0.00');
  });

  it('never prints a broken amount', () => {
    expect(formatMoney(Number.NaN, 'EUR')).toContain('0.00');
    expect(formatMoney(Number.POSITIVE_INFINITY, 'EUR')).toContain('0.00');
  });

  it('formats a negative amount', () => {
    expect(formatMoney(-5, 'EUR')).toContain('5.00');
  });

  it('accepts an unknown but well formed code', () => {
    const result = formatMoney(12.5, 'XYZ');

    expect(result).toContain('12.50');
    expect(result).toContain('XYZ');
  });
});

describe('when the engine cannot format currencies', () => {
  const realIntl = globalThis.Intl;

  afterEach(() => {
    globalThis.Intl = realIntl;
    resetCurrencyFormattingProbe();
  });

  const withoutIntl = () => {
    globalThis.Intl = undefined as unknown as typeof Intl;
    resetCurrencyFormattingProbe();
  };

  it('reports that it cannot', () => {
    withoutIntl();

    expect(supportsCurrencyFormatting()).toBe(false);
  });

  it('still prints the amount with a symbol', () => {
    withoutIntl();

    expect(formatMoney(12.5, 'EUR')).toBe('12.50 €');
    expect(formatMoney(12.5, 'USD')).toBe('12.50 $');
  });

  it('still drops the decimals for a whole unit currency', () => {
    withoutIntl();

    expect(formatMoney(1234.5, 'ALL')).toBe('1235 ALL');
  });

  it('still handles a missing code and amount', () => {
    withoutIntl();

    expect(formatMoney(null, undefined)).toBe('0.00');
  });

  it('ignores an engine that reports a bare number', () => {
    globalThis.Intl = {
      NumberFormat: class {
        format() {
          return '1';
        }
      },
    } as unknown as typeof Intl;
    resetCurrencyFormattingProbe();

    expect(supportsCurrencyFormatting()).toBe(false);
    expect(formatMoney(12.5, 'EUR')).toBe('12.50 €');
  });

  it('only probes the engine once', () => {
    const format = jest.fn(() => '€1.00');
    globalThis.Intl = {
      NumberFormat: jest.fn(() => ({ format })),
    } as unknown as typeof Intl;
    resetCurrencyFormattingProbe();

    formatMoney(1, 'EUR');
    formatMoney(2, 'EUR');
    formatMoney(3, 'EUR');

    expect(globalThis.Intl.NumberFormat).toHaveBeenCalledTimes(4);
  });
});

describe('the currency symbol helper', () => {
  it('knows the symbols the app ships with', () => {
    expect(currencySymbol('EUR')).toBe('€');
    expect(currencySymbol('USD')).toBe('$');
    expect(currencySymbol('GBP')).toBe('£');
  });

  it('shows the code itself for anything else', () => {
    expect(currencySymbol('ALL')).toBe('ALL');
    expect(currencySymbol(undefined)).toBe('');
  });
});
