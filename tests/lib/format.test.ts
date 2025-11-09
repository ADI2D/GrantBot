import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatPercent } from '@/lib/format';

describe('Format Utilities', () => {
  describe('formatCurrency', () => {
    it('should format positive numbers as USD currency', () => {
      expect(formatCurrency(1000)).toBe('$1,000');
      expect(formatCurrency(50000)).toBe('$50,000');
      expect(formatCurrency(1234567)).toBe('$1,234,567');
    });

    it('should format zero as currency', () => {
      expect(formatCurrency(0)).toBe('$0');
    });

    it('should format negative numbers as currency', () => {
      expect(formatCurrency(-500)).toBe('-$500');
      expect(formatCurrency(-1000)).toBe('-$1,000');
    });

    it('should handle decimal values by rounding', () => {
      expect(formatCurrency(1234.56)).toBe('$1,235');
      expect(formatCurrency(999.99)).toBe('$1,000');
      expect(formatCurrency(1000.01)).toBe('$1,000');
    });

    it('should return "--" for null or undefined', () => {
      expect(formatCurrency(null)).toBe('--');
      expect(formatCurrency(undefined)).toBe('--');
    });

    it('should support different currencies', () => {
      expect(formatCurrency(1000, 'EUR')).toBe('€1,000');
      expect(formatCurrency(1000, 'GBP')).toBe('£1,000');
      expect(formatCurrency(1000, 'JPY')).toBe('¥1,000');
    });

    it('should handle very large numbers', () => {
      expect(formatCurrency(1000000000)).toBe('$1,000,000,000');
      expect(formatCurrency(999999999999)).toBe('$999,999,999,999');
    });
  });

  describe('formatDate', () => {
    it('should format valid date strings', () => {
      expect(formatDate('2025-01-15')).toBe('Jan 15');
      expect(formatDate('2025-12-31')).toBe('Dec 31');
      expect(formatDate('2025-06-01')).toBe('Jun 1');
    });

    it('should format ISO date-time strings', () => {
      expect(formatDate('2025-03-20T10:30:00Z')).toBe('Mar 20');
      expect(formatDate('2025-11-09T21:00:00.000Z')).toBe('Nov 9');
    });

    it('should return "--" for null or undefined', () => {
      expect(formatDate(null)).toBe('--');
      expect(formatDate(undefined)).toBe('--');
    });

    it('should return "--" for empty string', () => {
      expect(formatDate('')).toBe('--');
    });

    it('should handle dates from different years', () => {
      // The formatter only shows month and day, not year
      expect(formatDate('2024-01-01')).toBe('Jan 1');
      expect(formatDate('2026-12-25')).toBe('Dec 25');
    });
  });

  describe('formatPercent', () => {
    it('should format decimal values as percentages', () => {
      expect(formatPercent(0.5)).toBe('50%');
      expect(formatPercent(0.75)).toBe('75%');
      expect(formatPercent(0.25)).toBe('25%');
    });

    it('should round to nearest integer', () => {
      expect(formatPercent(0.555)).toBe('56%');
      expect(formatPercent(0.544)).toBe('54%');
      expect(formatPercent(0.999)).toBe('100%');
      expect(formatPercent(0.001)).toBe('0%');
    });

    it('should handle 0 and 1', () => {
      expect(formatPercent(0)).toBe('0%');
      expect(formatPercent(1)).toBe('100%');
    });

    it('should handle values greater than 1', () => {
      expect(formatPercent(1.5)).toBe('150%');
      expect(formatPercent(2.0)).toBe('200%');
      expect(formatPercent(10)).toBe('1000%');
    });

    it('should handle negative values', () => {
      expect(formatPercent(-0.5)).toBe('-50%');
      expect(formatPercent(-1)).toBe('-100%');
    });

    it('should return "--" for null or undefined', () => {
      expect(formatPercent(null)).toBe('--');
      expect(formatPercent(undefined)).toBe('--');
    });

    it('should handle very small values', () => {
      expect(formatPercent(0.001)).toBe('0%');
      expect(formatPercent(0.005)).toBe('1%');
      expect(formatPercent(0.0001)).toBe('0%');
    });
  });
});
