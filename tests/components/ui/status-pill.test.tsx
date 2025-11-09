import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusPill } from '@/components/ui/status-pill';

describe('StatusPill Component', () => {
  it('should render status pill with text', () => {
    render(<StatusPill>Active</StatusPill>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should apply default tone by default', () => {
    const { container } = render(<StatusPill>Default</StatusPill>);
    const pill = container.firstChild as HTMLElement;
    expect(pill).toHaveClass('bg-[color:var(--color-surface-muted)]');
    expect(pill).toHaveClass('text-[color:var(--color-text-secondary)]');
  });

  it('should apply success tone', () => {
    const { container } = render(<StatusPill tone="success">Success</StatusPill>);
    const pill = container.firstChild as HTMLElement;
    expect(pill).toHaveClass('bg-[color:var(--color-surface-positive)]');
    expect(pill).toHaveClass('text-[color:var(--color-success-green)]');
  });

  it('should apply warning tone', () => {
    const { container } = render(<StatusPill tone="warning">Warning</StatusPill>);
    const pill = container.firstChild as HTMLElement;
    expect(pill).toHaveClass('bg-[color:var(--color-surface-warning)]');
    expect(pill).toHaveClass('text-[color:var(--color-warning-red)]');
  });

  it('should apply info tone', () => {
    const { container } = render(<StatusPill tone="info">Info</StatusPill>);
    const pill = container.firstChild as HTMLElement;
    expect(pill).toHaveClass('bg-[color:var(--color-surface-info)]');
    expect(pill).toHaveClass('text-[color:var(--color-growth-teal)]');
  });

  it('should accept custom className', () => {
    const { container } = render(<StatusPill className="custom-pill">Custom</StatusPill>);
    const pill = container.firstChild as HTMLElement;
    expect(pill).toHaveClass('custom-pill');
  });

  it('should merge custom classes with default classes', () => {
    const { container } = render(<StatusPill className="ml-4 uppercase">Merged</StatusPill>);
    const pill = container.firstChild as HTMLElement;
    expect(pill).toHaveClass('ml-4');
    expect(pill).toHaveClass('uppercase');
    expect(pill).toHaveClass('inline-flex');
  });

  it('should pass through HTML attributes', () => {
    const { container } = render(<StatusPill data-testid="test-pill" aria-label="Test">Pill</StatusPill>);
    const pill = container.firstChild as HTMLElement;
    expect(pill).toHaveAttribute('data-testid', 'test-pill');
    expect(pill).toHaveAttribute('aria-label', 'Test');
  });

  it('should render as span element', () => {
    const { container } = render(<StatusPill>Span</StatusPill>);
    const pill = container.firstChild as HTMLElement;
    expect(pill.tagName).toBe('SPAN');
  });

  it('should apply base styling classes', () => {
    const { container } = render(<StatusPill>Styled</StatusPill>);
    const pill = container.firstChild as HTMLElement;
    expect(pill).toHaveClass('inline-flex');
    expect(pill).toHaveClass('items-center');
    expect(pill).toHaveClass('rounded-full');
    expect(pill).toHaveClass('px-2.5');
    expect(pill).toHaveClass('py-0.5');
    expect(pill).toHaveClass('text-xs');
    expect(pill).toHaveClass('font-semibold');
  });

  it('should handle different content types', () => {
    render(
      <StatusPill>
        <span>Multi</span>
        <span>Part</span>
      </StatusPill>
    );
    expect(screen.getByText('Multi')).toBeInTheDocument();
    expect(screen.getByText('Part')).toBeInTheDocument();
  });

  it('should support all tone variants', () => {
    const { rerender, container } = render(<StatusPill tone="default">Default</StatusPill>);
    let pill = container.firstChild as HTMLElement;
    expect(pill).toHaveClass('bg-[color:var(--color-surface-muted)]');

    rerender(<StatusPill tone="success">Success</StatusPill>);
    pill = container.firstChild as HTMLElement;
    expect(pill).toHaveClass('bg-[color:var(--color-surface-positive)]');

    rerender(<StatusPill tone="warning">Warning</StatusPill>);
    pill = container.firstChild as HTMLElement;
    expect(pill).toHaveClass('bg-[color:var(--color-surface-warning)]');

    rerender(<StatusPill tone="info">Info</StatusPill>);
    pill = container.firstChild as HTMLElement;
    expect(pill).toHaveClass('bg-[color:var(--color-surface-info)]');
  });
});
