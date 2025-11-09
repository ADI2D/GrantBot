import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '@/components/ui/card';

describe('Card Component', () => {
  it('should render card with content', () => {
    render(<Card>Card Content</Card>);
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('should render as div element', () => {
    const { container } = render(<Card>Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.tagName).toBe('DIV');
  });

  it('should apply base styling classes', () => {
    const { container } = render(<Card>Styled</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('rounded-[var(--radius-soft)]');
    expect(card).toHaveClass('border');
    expect(card).toHaveClass('border-[color:var(--color-border)]');
    expect(card).toHaveClass('bg-[color:var(--color-surface)]');
    expect(card).toHaveClass('shadow-soft');
    expect(card).toHaveClass('transition-shadow');
    expect(card).toHaveClass('duration-200');
    expect(card).toHaveClass('hover:shadow-hover');
  });

  it('should accept custom className', () => {
    const { container } = render(<Card className="custom-card">Custom</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('custom-card');
  });

  it('should merge custom classes with default classes', () => {
    const { container } = render(<Card className="p-6 m-4">Merged</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('p-6');
    expect(card).toHaveClass('m-4');
    expect(card).toHaveClass('rounded-[var(--radius-soft)]');
  });

  it('should pass through HTML attributes', () => {
    const { container } = render(
      <Card data-testid="test-card" role="article" aria-label="Test Card">
        Card
      </Card>
    );
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveAttribute('data-testid', 'test-card');
    expect(card).toHaveAttribute('role', 'article');
    expect(card).toHaveAttribute('aria-label', 'Test Card');
  });

  it('should render nested content', () => {
    render(
      <Card>
        <h2>Title</h2>
        <p>Description</p>
      </Card>
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('should handle empty children', () => {
    const { container } = render(<Card />);
    const card = container.firstChild as HTMLElement;
    expect(card).toBeInTheDocument();
    expect(card.childNodes).toHaveLength(0);
  });

  it('should support event handlers', () => {
    let clicked = false;
    const handleClick = () => {
      clicked = true;
    };

    const { container } = render(<Card onClick={handleClick}>Clickable</Card>);
    const card = container.firstChild as HTMLElement;
    card.click();

    expect(clicked).toBe(true);
  });
});
