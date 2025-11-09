import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Progress } from '@/components/ui/progress';

describe('Progress Component', () => {
  it('should render progress bar', () => {
    const { container } = render(<Progress value={50} />);
    const progress = container.firstChild as HTMLElement;
    expect(progress).toBeInTheDocument();
  });

  it('should render as div element', () => {
    const { container } = render(<Progress value={50} />);
    const progress = container.firstChild as HTMLElement;
    expect(progress.tagName).toBe('DIV');
  });

  it('should apply correct width for 50% progress', () => {
    const { container } = render(<Progress value={50} />);
    const progress = container.firstChild as HTMLElement;
    const bar = progress.firstChild as HTMLElement;
    expect(bar).toHaveStyle({ width: '50%' });
  });

  it('should apply correct width for 0% progress', () => {
    const { container } = render(<Progress value={0} />);
    const progress = container.firstChild as HTMLElement;
    const bar = progress.firstChild as HTMLElement;
    expect(bar).toHaveStyle({ width: '0%' });
  });

  it('should apply correct width for 100% progress', () => {
    const { container } = render(<Progress value={100} />);
    const progress = container.firstChild as HTMLElement;
    const bar = progress.firstChild as HTMLElement;
    expect(bar).toHaveStyle({ width: '100%' });
  });

  it('should clamp values above 100 to 100%', () => {
    const { container } = render(<Progress value={150} />);
    const progress = container.firstChild as HTMLElement;
    const bar = progress.firstChild as HTMLElement;
    expect(bar).toHaveStyle({ width: '100%' });
  });

  it('should clamp negative values to 0%', () => {
    const { container } = render(<Progress value={-20} />);
    const progress = container.firstChild as HTMLElement;
    const bar = progress.firstChild as HTMLElement;
    expect(bar).toHaveStyle({ width: '0%' });
  });

  it('should handle decimal values', () => {
    const { container } = render(<Progress value={75.5} />);
    const progress = container.firstChild as HTMLElement;
    const bar = progress.firstChild as HTMLElement;
    expect(bar).toHaveStyle({ width: '75.5%' });
  });

  it('should accept custom className', () => {
    const { container } = render(<Progress value={50} className="custom-progress" />);
    const progress = container.firstChild as HTMLElement;
    expect(progress).toHaveClass('custom-progress');
  });

  it('should merge custom classes with default classes', () => {
    const { container } = render(<Progress value={50} className="h-4 w-1/2" />);
    const progress = container.firstChild as HTMLElement;
    expect(progress).toHaveClass('h-4');
    expect(progress).toHaveClass('w-1/2');
  });

  it('should apply base styling classes to container', () => {
    const { container } = render(<Progress value={50} />);
    const progress = container.firstChild as HTMLElement;
    expect(progress).toHaveClass('relative');
    expect(progress).toHaveClass('h-2');
    expect(progress).toHaveClass('w-full');
    expect(progress).toHaveClass('overflow-hidden');
    expect(progress).toHaveClass('rounded-full');
    expect(progress).toHaveClass('bg-[color:var(--color-surface-muted)]');
  });

  it('should apply styling classes to progress bar', () => {
    const { container } = render(<Progress value={50} />);
    const progress = container.firstChild as HTMLElement;
    const bar = progress.firstChild as HTMLElement;
    expect(bar).toHaveClass('absolute');
    expect(bar).toHaveClass('left-0');
    expect(bar).toHaveClass('top-0');
    expect(bar).toHaveClass('h-full');
    expect(bar).toHaveClass('rounded-full');
    expect(bar).toHaveClass('bg-[color:var(--color-growth-teal)]');
    expect(bar).toHaveClass('transition-all');
  });

  it('should pass through HTML attributes', () => {
    const { container } = render(<Progress value={50} data-testid="test-progress" aria-label="Progress" />);
    const progress = container.firstChild as HTMLElement;
    expect(progress).toHaveAttribute('data-testid', 'test-progress');
    expect(progress).toHaveAttribute('aria-label', 'Progress');
  });

  it('should update width when value changes', () => {
    const { container, rerender } = render(<Progress value={25} />);
    let progress = container.firstChild as HTMLElement;
    let bar = progress.firstChild as HTMLElement;
    expect(bar).toHaveStyle({ width: '25%' });

    rerender(<Progress value={75} />);
    progress = container.firstChild as HTMLElement;
    bar = progress.firstChild as HTMLElement;
    expect(bar).toHaveStyle({ width: '75%' });
  });

  it('should handle edge case values', () => {
    const { container: container1 } = render(<Progress value={0.1} />);
    const bar1 = (container1.firstChild as HTMLElement).firstChild as HTMLElement;
    expect(bar1).toHaveStyle({ width: '0.1%' });

    const { container: container2 } = render(<Progress value={99.9} />);
    const bar2 = (container2.firstChild as HTMLElement).firstChild as HTMLElement;
    expect(bar2).toHaveStyle({ width: '99.9%' });
  });

  it('should properly clamp with Math.min and Math.max', () => {
    // Test the clamping logic: Math.min(100, Math.max(0, value))
    const testCases = [
      { value: -50, expected: '0%' },
      { value: 0, expected: '0%' },
      { value: 50, expected: '50%' },
      { value: 100, expected: '100%' },
      { value: 200, expected: '100%' },
    ];

    testCases.forEach(({ value, expected }) => {
      const { container } = render(<Progress value={value} />);
      const bar = (container.firstChild as HTMLElement).firstChild as HTMLElement;
      expect(bar).toHaveStyle({ width: expected });
    });
  });
});
