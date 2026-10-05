import { describe, it, expect } from 'vitest';
import {
  formatKRW,
  formatNumberInput,
  digitsOnly,
  formatRate,
  formatPercent2,
  formatDday,
} from '@/lib/format';

describe('format', () => {
  it('formatKRW', () => {
    const cases: [number, string][] = [
      [210000000, '2억 1,000만원'],
      [525000, '52만 5,000원'],
      [187500, '18만 7,500원'],
      [0, '0원'],
      [200000000, '2억원'],
      [2250000, '225만원'],
      [60000000, '6,000만원'],
      [150000, '15만원'],
      [5000, '5,000원'],
      [100000001, '1억 1원'],
    ];
    for (const [n, s] of cases) expect(formatKRW(n)).toBe(s);
  });

  it('formatNumberInput / digitsOnly', () => {
    expect(formatNumberInput('200000000')).toBe('200,000,000');
    expect(formatNumberInput('')).toBe('');
    expect(formatNumberInput('2,000a')).toBe('2,000');
    expect(digitsOnly('1,2a3')).toBe('123');
  });

  it('formatRate / formatPercent2 / formatDday', () => {
    expect(formatRate(4.5)).toBe('4.5');
    expect(formatRate(9)).toBe('9');
    expect(formatRate(3.25)).toBe('3.25');
    expect(formatPercent2(2.5)).toBe('2.50');
    expect(formatDday(117)).toBe('D-117');
    expect(formatDday(0)).toBe('D-0');
  });
});
