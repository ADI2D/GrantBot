import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/components/ui/input';

describe('Input Component', () => {
  it('should render input element', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('should render with placeholder', () => {
    render(<Input placeholder="Enter your name" />);
    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
  });

  it('should handle value changes', async () => {
    const user = userEvent.setup();
    render(<Input />);
    const input = screen.getByRole('textbox') as HTMLInputElement;

    await user.type(input, 'Hello World');
    expect(input.value).toBe('Hello World');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('should accept custom className', () => {
    const { container } = render(<Input className="custom-input" />);
    const input = container.querySelector('input');
    expect(input).toHaveClass('custom-input');
  });

  it('should merge custom classes with default classes', () => {
    const { container } = render(<Input className="w-1/2 bg-white" />);
    const input = container.querySelector('input');
    expect(input).toHaveClass('w-1/2');
    expect(input).toHaveClass('flex');
  });

  it('should apply default styling classes', () => {
    const { container } = render(<Input />);
    const input = container.querySelector('input');
    expect(input).toHaveClass('flex');
    expect(input).toHaveClass('h-11');
    expect(input).toHaveClass('w-full');
    expect(input).toHaveClass('rounded-[var(--radius-soft)]');
  });

  it('should support different input types', () => {
    const { container } = render(<Input type="email" />);
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('should handle onChange events', async () => {
    const user = userEvent.setup();
    let value = '';
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      value = e.target.value;
    };

    render(<Input onChange={handleChange} />);
    const input = screen.getByRole('textbox');

    await user.type(input, 'Test');
    expect(value).toBe('Test');
  });

  it('should forward ref correctly', () => {
    const ref = { current: null } as React.RefObject<HTMLInputElement>;
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('should pass through HTML attributes', () => {
    render(<Input data-testid="test-input" aria-label="Test Input" maxLength={10} />);
    const input = screen.getByTestId('test-input');
    expect(input).toHaveAttribute('aria-label', 'Test Input');
    expect(input).toHaveAttribute('maxLength', '10');
  });

  it('should support required attribute', () => {
    render(<Input required />);
    const input = screen.getByRole('textbox');
    expect(input).toBeRequired();
  });

  it('should support readonly attribute', () => {
    render(<Input readOnly value="Read only text" />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input).toHaveAttribute('readOnly');
    expect(input.value).toBe('Read only text');
  });

  it('should handle different value types', () => {
    const { container } = render(<Input type="number" defaultValue={42} />);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('42');
  });

  it('should support autoFocus', () => {
    render(<Input autoFocus />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveFocus();
  });

  it('should have correct displayName', () => {
    expect(Input.displayName).toBe('Input');
  });
});
