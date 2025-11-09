import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

describe('Badge Component', () => {
  it('should render badge with text', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  it('should apply neutral tone by default', () => {
    const { container } = render(<Badge>Default</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('bg-[color:var(--color-surface-muted)]');
    expect(badge).toHaveClass('text-[color:var(--color-text-secondary)]');
  });

  it('should apply success tone', () => {
    const { container } = render(<Badge tone="success">Success</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('bg-[color:var(--color-surface-positive)]');
    expect(badge).toHaveClass('text-[color:var(--color-success-green)]');
  });

  it('should apply warning tone', () => {
    const { container } = render(<Badge tone="warning">Warning</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('bg-[color:var(--color-surface-warning)]');
    expect(badge).toHaveClass('text-[color:var(--color-warning-red)]');
  });

  it('should apply info tone', () => {
    const { container } = render(<Badge tone="info">Info</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('bg-[color:var(--color-surface-info)]');
    expect(badge).toHaveClass('text-[color:var(--color-growth-teal)]');
  });

  it('should accept custom className', () => {
    const { container } = render(<Badge className="custom-class">Custom</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('custom-class');
  });

  it('should merge custom classes with default classes', () => {
    const { container } = render(<Badge className="ml-4">Merged</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('ml-4');
    expect(badge).toHaveClass('inline-flex');
    expect(badge).toHaveClass('rounded-full');
  });

  it('should pass through HTML attributes', () => {
    const { container } = render(<Badge data-testid="test-badge" aria-label="Test">Badge</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveAttribute('data-testid', 'test-badge');
    expect(badge).toHaveAttribute('aria-label', 'Test');
  });

  it('should render as span element', () => {
    const { container } = render(<Badge>Span</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge.tagName).toBe('SPAN');
  });

  it('should apply base styling classes', () => {
    const { container } = render(<Badge>Styled</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('inline-flex');
    expect(badge).toHaveClass('items-center');
    expect(badge).toHaveClass('rounded-full');
    expect(badge).toHaveClass('px-3');
    expect(badge).toHaveClass('py-0.5');
    expect(badge).toHaveClass('text-xs');
    expect(badge).toHaveClass('font-semibold');
    expect(badge).toHaveClass('tracking-tight');
  });
});
