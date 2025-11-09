import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('Utils', () => {
  describe('cn (className merger)', () => {
    it('should merge single class name', () => {
      expect(cn('text-red-500')).toBe('text-red-500');
    });

    it('should merge multiple class names', () => {
      const result = cn('text-red-500', 'bg-blue-200', 'p-4');
      expect(result).toContain('text-red-500');
      expect(result).toContain('bg-blue-200');
      expect(result).toContain('p-4');
    });

    it('should handle conditional classes with objects', () => {
      const result = cn({
        'text-red-500': true,
        'bg-blue-200': false,
        'p-4': true,
      });
      expect(result).toContain('text-red-500');
      expect(result).toContain('p-4');
      expect(result).not.toContain('bg-blue-200');
    });

    it('should handle arrays of classes', () => {
      const result = cn(['text-red-500', 'bg-blue-200'], 'p-4');
      expect(result).toContain('text-red-500');
      expect(result).toContain('bg-blue-200');
      expect(result).toContain('p-4');
    });

    it('should handle undefined and null values', () => {
      const result = cn('text-red-500', undefined, null, 'bg-blue-200');
      expect(result).toContain('text-red-500');
      expect(result).toContain('bg-blue-200');
    });

    it('should merge Tailwind classes correctly (tailwind-merge)', () => {
      // tailwind-merge should resolve conflicts by keeping the last one
      const result = cn('p-4', 'p-8');
      expect(result).toBe('p-8');
      expect(result).not.toContain('p-4');
    });

    it('should handle complex Tailwind class conflicts', () => {
      const result = cn('text-sm', 'text-lg', 'font-normal', 'font-bold');
      expect(result).toBe('text-lg font-bold');
    });

    it('should preserve non-conflicting classes', () => {
      const result = cn('bg-red-500', 'text-white', 'p-4', 'p-8');
      expect(result).toContain('bg-red-500');
      expect(result).toContain('text-white');
      expect(result).toContain('p-8');
      expect(result).not.toContain('p-4');
    });

    it('should handle empty input', () => {
      expect(cn()).toBe('');
      expect(cn('')).toBe('');
    });

    it('should handle mixed conditional and regular classes', () => {
      const isActive = true;
      const isDisabled = false;

      const result = cn(
        'base-class',
        {
          'active-class': isActive,
          'disabled-class': isDisabled,
        },
        'another-class'
      );

      expect(result).toContain('base-class');
      expect(result).toContain('active-class');
      expect(result).toContain('another-class');
      expect(result).not.toContain('disabled-class');
    });

    it('should work with component props pattern', () => {
      const className = 'custom-class';
      const variant = 'primary';

      const result = cn(
        'base-button',
        {
          'variant-primary': variant === 'primary',
          'variant-secondary': variant === 'secondary',
        },
        className
      );

      expect(result).toContain('base-button');
      expect(result).toContain('variant-primary');
      expect(result).toContain('custom-class');
      expect(result).not.toContain('variant-secondary');
    });
  });
});
