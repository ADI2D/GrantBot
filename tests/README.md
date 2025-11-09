# GrantBot Test Suite

This directory contains the test suite for GrantBot, built with **Vitest** and **React Testing Library**.

## Running Tests

```bash
# Run tests in watch mode (interactive)
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

```
tests/
├── setup.ts                    # Global test setup and mocks
├── lib/                        # Tests for utility functions and libraries
│   ├── admin-auth.test.ts     # Admin authorization tests
│   └── match-scoring.test.ts  # Grant matching algorithm tests
└── components/                 # Tests for React components
    └── ui/                     # UI component tests
        └── button.test.tsx    # Button component tests
```

## Writing Tests

### Basic Test Example

```typescript
import { describe, it, expect } from 'vitest';

describe('My Function', () => {
  it('should do something', () => {
    const result = myFunction();
    expect(result).toBe(expected);
  });
});
```

### Component Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyComponent from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    render(<MyComponent />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

## Test Configuration

Test configuration is defined in `vitest.config.ts`:

- **Environment**: jsdom (browser-like environment)
- **Globals**: Enabled (no need to import `describe`, `it`, `expect`)
- **Setup Files**: `tests/setup.ts` (runs before all tests)
- **Coverage**: v8 provider with text, json, and html reports

## Mocked Modules

The following modules are mocked globally in `tests/setup.ts`:

### Next.js Router
```typescript
import { useRouter } from 'next/navigation';
// Mocked with common methods (push, replace, etc.)
```

### Supabase Client
```typescript
import { createBrowserSupabase } from '@/lib/supabase-client';
// Mocked with basic CRUD operations
```

## Environment Variables

Test environment variables are set in `tests/setup.ts`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_DEMO_ORG_ID`

## Test Coverage Goals

We aim for the following coverage targets:

- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the code does, not how it does it
2. **Use Descriptive Test Names**: Test names should describe the expected behavior
3. **Keep Tests Isolated**: Each test should be independent and not rely on others
4. **Mock External Dependencies**: Mock API calls, external services, and heavy computations
5. **Test Edge Cases**: Include tests for error conditions, empty states, and boundary values
6. **Use Testing Library Queries**: Prefer `getByRole` and `getByLabelText` over `getByTestId`

## Common Testing Patterns

### Testing Async Functions
```typescript
it('should fetch data', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});
```

### Testing Error Handling
```typescript
it('should throw error for invalid input', () => {
  expect(() => myFunction(null)).toThrow('Invalid input');
});
```

### Testing Form Interactions
```typescript
it('should submit form', async () => {
  render(<MyForm />);
  await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));
  expect(screen.getByText('Success')).toBeInTheDocument();
});
```

## Continuous Integration

Tests run automatically on:
- Every push to main/master/develop branches
- Every pull request
- Via GitHub Actions workflow (`.github/workflows/ci.yml`)

## Debugging Tests

### Run Specific Test File
```bash
npm test -- tests/lib/admin-auth.test.ts
```

### Run Tests Matching Pattern
```bash
npm test -- --grep "admin"
```

### View Test UI
```bash
npm run test:ui
```
The UI opens at http://localhost:51204 with interactive test exploration.

## Adding New Tests

1. Create test file next to the code you're testing (or in `tests/` directory)
2. Use `.test.ts` or `.test.tsx` extension
3. Import necessary testing utilities
4. Write descriptive test cases
5. Run tests locally before committing
6. Ensure coverage doesn't decrease

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
