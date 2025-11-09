import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Label } from '@/components/ui/label';

describe('Label Component', () => {
  it('should render label with text', () => {
    render(<Label>Username</Label>);
    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('should render as label element', () => {
    const { container } = render(<Label>Email</Label>);
    const label = container.firstChild as HTMLElement;
    expect(label.tagName).toBe('LABEL');
  });

  it('should apply default styling classes', () => {
    const { container } = render(<Label>Password</Label>);
    const label = container.firstChild as HTMLElement;
    expect(label).toHaveClass('text-sm');
    expect(label).toHaveClass('font-medium');
    expect(label).toHaveClass('leading-none');
    expect(label).toHaveClass('text-slate-700');
  });

  it('should accept custom className', () => {
    const { container } = render(<Label className="custom-label">Name</Label>);
    const label = container.firstChild as HTMLElement;
    expect(label).toHaveClass('custom-label');
  });

  it('should merge custom classes with default classes', () => {
    const { container } = render(<Label className="text-lg font-bold">Title</Label>);
    const label = container.firstChild as HTMLElement;
    expect(label).toHaveClass('text-lg');
    expect(label).toHaveClass('font-bold');
  });

  it('should support htmlFor attribute', () => {
    render(<Label htmlFor="email-input">Email Address</Label>);
    const label = screen.getByText('Email Address');
    expect(label).toHaveAttribute('for', 'email-input');
  });

  it('should forward ref correctly', () => {
    const ref = { current: null } as React.RefObject<HTMLLabelElement>;
    render(<Label ref={ref}>Test Label</Label>);
    expect(ref.current).toBeInstanceOf(HTMLLabelElement);
  });

  it('should pass through HTML attributes', () => {
    render(
      <Label data-testid="test-label" aria-label="Accessible Label">
        Label Text
      </Label>
    );
    const label = screen.getByTestId('test-label');
    expect(label).toHaveAttribute('aria-label', 'Accessible Label');
  });

  it('should render with nested elements', () => {
    render(
      <Label>
        <span>First Name</span>
        <span className="text-red-500">*</span>
      </Label>
    );
    expect(screen.getByText('First Name')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('should handle click events', () => {
    let clicked = false;
    const handleClick = () => {
      clicked = true;
    };

    const { container } = render(<Label onClick={handleClick}>Clickable</Label>);
    const label = container.firstChild as HTMLElement;
    label.click();

    expect(clicked).toBe(true);
  });

  it('should have peer-disabled styles in className', () => {
    const { container } = render(<Label>Disabled Peer</Label>);
    const label = container.firstChild as HTMLElement;
    expect(label).toHaveClass('peer-disabled:cursor-not-allowed');
    expect(label).toHaveClass('peer-disabled:opacity-70');
  });

  it('should have correct displayName', () => {
    expect(Label.displayName).toBe('Label');
  });

  it('should work with input association', () => {
    render(
      <div>
        <Label htmlFor="username">Username</Label>
        <input id="username" type="text" />
      </div>
    );

    const label = screen.getByText('Username');
    const input = screen.getByRole('textbox');

    expect(label).toHaveAttribute('for', 'username');
    expect(input).toHaveAttribute('id', 'username');
  });
});
