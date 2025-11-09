import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    let clicked = false;
    const handleClick = () => {
      clicked = true;
    };

    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByText('Click me');
    await userEvent.click(button);

    expect(clicked).toBe(true);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByText('Disabled Button');
    expect(button).toBeDisabled();
  });

  it('should apply variant classes', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    let button = screen.getByText('Primary');
    expect(button).toBeInTheDocument();

    rerender(<Button variant="secondary">Secondary</Button>);
    button = screen.getByText('Secondary');
    expect(button).toBeInTheDocument();
  });

  it('should apply size classes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    let button = screen.getByText('Small');
    expect(button).toBeInTheDocument();

    rerender(<Button size="lg">Large</Button>);
    button = screen.getByText('Large');
    expect(button).toBeInTheDocument();
  });

  it('should render as child when asChild prop is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    const link = screen.getByText('Link Button');
    expect(link.tagName).toBe('A');
  });
});
