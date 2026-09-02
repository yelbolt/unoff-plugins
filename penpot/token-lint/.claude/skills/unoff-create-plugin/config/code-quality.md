---
name: code-quality
description: TypeScript strict mode, ESLint, Prettier, and Vitest setup for the plugin. Use when configuring linting rules, writing tests for Canvas or UI layers, or setting up CI/CD quality gates.
---

# Code Quality & Testing

## Overview

The plugin template does not currently include a test runner or test files. Code quality is enforced through **TypeScript strict mode**, **ESLint**, and **Prettier**. This document covers the existing quality toolchain and provides guidance for adding tests.

## Current Quality Toolchain

### Available Scripts

```json
{
  "typecheck": "npx tsc --noEmit",
  "lint": "npx eslint ./src/** --fix --ext .ts,.tsx .",
  "format": "npx prettier './src' --write"
}
```

### TypeScript Strict Mode

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "strict": true  // enables all strict checks
  }
}
```

This enforces: `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitAny`, `noImplicitThis`, `alwaysStrict`.

### ESLint

Key rules from `.eslintrc.json`:

| Rule | Level | Effect |
|---|---|---|
| `@typescript-eslint/no-explicit-any` | warn | Discourages `any` types |
| `eqeqeq` | error | Requires `===` (except null) |
| `curly: multi` | warn | Braces optional for single-line |
| `prefer-const` | warn | Prefer `const` over `let` |
| `import/order` | error | Enforced import ordering |

### Prettier

Key formatting rules from `.prettierrc.json`:

| Setting | Value |
|---|---|
| Semi | `false` (no semicolons) |
| Quotes | Single quotes |
| Tab width | 2 spaces |
| Trailing comma | `es5` |
| JSX attributes | One per line |

## Recommended Test Setup

### Vitest (Recommended)

Vitest is the natural choice — it shares the Vite config, supports TypeScript natively, and has a fast execution speed:

```bash
npm install -D vitest @testing-library/preact @testing-library/jest-dom jsdom
```

#### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'
import preact from '@preact/preset-vite'
import path from 'path'

export default defineConfig({
  plugins: [preact()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime',
    },
  },
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime',
    },
  },
})
```

#### package.json script

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

## What to Test

### Testability by Layer

| Layer | Testability | Strategy |
|---|---|---|
| Canvas (`src/index.ts`, `bridges/`) | Medium | Mock `figma` global, test action maps |
| External services (`external/`) | High | Mock `fetch`, test Promise resolution/rejection |
| Stores (`stores/`) | High | Test Nanostores atoms directly |
| Utils (`utils/`) | High | Pure functions, straightforward |
| UI Components (`ui/`) | Medium | Preact Testing Library with mocked context |
| Types (`types/`) | N/A | Enforced by TypeScript compiler |

### 1. Testing Bridge Functions

Bridge functions process messages and call Figma API. Mock the `figma` global:

```typescript
// src/bridges/__tests__/loadUI.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Figma globals
const mockFigma = {
  clientStorage: {
    getAsync: vi.fn(),
    setAsync: vi.fn(),
  },
  notify: vi.fn(),
  openExternal: vi.fn(),
  ui: {
    postMessage: vi.fn(),
  },
}

beforeEach(() => {
  ;(globalThis as any).figma = mockFigma
  vi.clearAllMocks()
})

describe('loadUI message handler', () => {
  it('should handle SET_ITEMS message', async () => {
    // Test that SET_ITEMS writes to clientStorage
    mockFigma.clientStorage.setAsync.mockResolvedValue(undefined)

    // Dispatch a SET_ITEMS message and verify storage calls
  })

  it('should fall back to DEFAULT on unknown message type', () => {
    // Verify unknown types don't throw
  })
})
```

### 2. Testing External Services

External service functions are Promise-based with `fetch`. Use `vi.fn()` to mock fetch:

```typescript
// src/app/external/license/__tests__/validateUserLicenseKey.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import validateUserLicenseKey from '../validateUserLicenseKey '

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('validateUserLicenseKey', () => {
  it('should resolve true for valid license', async () => {
    const mockResponse = {
      json: () => Promise.resolve({ valid: true }),
    }
    ;(fetch as any).mockResolvedValue(mockResponse)

    const result = await validateUserLicenseKey({
      corsWorkerUrl: 'https://cors.example.com',
      storeApiUrl: 'https://api.example.com',
      licenseKey: 'test-key',
      instanceId: 'test-instance',
    })

    expect(result).toBe(true)
  })

  it('should reject with error for invalid license', async () => {
    const mockResponse = {
      json: () => Promise.resolve({ error: 'Invalid key' }),
    }
    ;(fetch as any).mockResolvedValue(mockResponse)

    await expect(
      validateUserLicenseKey({
        corsWorkerUrl: 'https://cors.example.com',
        storeApiUrl: 'https://api.example.com',
        licenseKey: 'bad-key',
        instanceId: 'test-instance',
      })
    ).rejects.toThrow('Invalid key')
  })
})
```

### 3. Testing Nanostores

Nanostores atoms are simple to test — they're just values with subscribers:

```typescript
// src/app/stores/__tests__/consent.test.ts
import { describe, it, expect } from 'vitest'

describe('consent store', () => {
  it('should initialize with empty consent array', () => {
    // Import the store and check initial value
    // $consent.get() should return []
  })

  it('should update when set', () => {
    // $consent.set([{ name: 'analytics', isConsented: true }])
    // Verify $consent.get() returns updated value
  })
})
```

### 4. Testing Utility Functions

Pure functions like `setContexts()` and `createI18n()` are highly testable:

```typescript
// src/app/utils/__tests__/setContexts.test.ts
import { describe, it, expect } from 'vitest'
import { setContexts } from '../setContexts'

describe('setContexts', () => {
  const mockFeatures = [
    {
      name: 'MY_FIRST_CONTEXT',
      isActive: true,
      isNew: false,
      type: 'CONTEXT',
      service: ['MY_SERVICE'],
      editor: ['figma'],
      // ... required Feature fields
    },
  ]

  it('should return active contexts based on features', () => {
    const contexts = setContexts(
      ['MY_FIRST_CONTEXT', 'MY_SECOND_CONTEXT'],
      'UNPAID',
      mockFeatures,
      'figma',
      'MY_SERVICE',
      (key) => key  // mock locales function
    )

    expect(contexts[0].isActive).toBe(true)
  })
})
```

### 5. Testing UI Components

Use Preact Testing Library for component tests:

```typescript
// src/app/ui/components/__tests__/Feature.test.tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/preact'
import Feature from '../Feature'

describe('Feature component', () => {
  it('should render children when active', () => {
    const { getByText } = render(
      <Feature isActive={true}>
        <span>Content</span>
      </Feature>
    )
    expect(getByText('Content')).toBeTruthy()
  })

  it('should not render children when inactive', () => {
    const { queryByText } = render(
      <Feature isActive={false}>
        <span>Content</span>
      </Feature>
    )
    expect(queryByText('Content')).toBeNull()
  })
})
```

### 6. Testing Events Tracker

```typescript
// src/app/external/tracking/__tests__/eventsTracker.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initMixpanel, setMixpanelEnv, setEditor } from '../client'
import { trackEditorEvent } from '../eventsTracker'

describe('trackEditorEvent', () => {
  const mockMixpanel = { track: vi.fn(), identify: vi.fn() }

  beforeEach(() => {
    vi.clearAllMocks()
    initMixpanel(mockMixpanel)
    setMixpanelEnv('development')
    setEditor('figma')
  })

  it('should track when enabled and consented', () => {
    trackEditorEvent(true, 'session-123', 'identity-456', 'UNPAID', true)

    expect(mockMixpanel.track).toHaveBeenCalledWith('Editor Run', {
      Env: 'development',
      Editor: 'figma',
      Plan: 'UNPAID',
    })
    expect(mockMixpanel.identify).toHaveBeenCalledWith('session-123')
  })

  it('should not track when consent is false', () => {
    trackEditorEvent(true, 'session-123', 'identity-456', 'UNPAID', false)
    expect(mockMixpanel.track).not.toHaveBeenCalled()
  })

  it('should not track when disabled', () => {
    trackEditorEvent(false, 'session-123', 'identity-456', 'UNPAID', true)
    expect(mockMixpanel.track).not.toHaveBeenCalled()
  })
})
```

## File Organization

```
src/
├── __tests__/
│   └── setup.ts           # Global test setup
├── app/
│   ├── external/
│   │   ├── auth/
│   │   │   └── __tests__/
│   │   ├── license/
│   │   │   └── __tests__/
│   │   └── tracking/
│   │       └── __tests__/
│   ├── stores/
│   │   └── __tests__/
│   ├── utils/
│   │   └── __tests__/
│   └── ui/
│       ├── components/
│       │   └── __tests__/
│       └── contexts/
│           └── __tests__/
├── bridges/
│   └── __tests__/
└── utils/
    └── __tests__/
```

Convention: Place `__tests__/` directories co-located with the source files they test.

## CI/CD Integration

Recommended quality gates in order:

```bash
# 1. Type checking
npm run typecheck

# 2. Linting
npm run lint

# 3. Tests (once added)
npm test

# 4. Build
npm run build:prod
```

## Best Practices

✅ Test external services by mocking `fetch` — they're Promise-based and easy to verify  
✅ Test utility functions first — highest ROI with simplest setup  
✅ Use `vi.fn()` for the `figma` global in Canvas-side tests  
✅ Run `typecheck` and `lint` before committing — they catch most issues  
✅ Co-locate test files with source in `__tests__/` directories  
✅ Mock `getSentry()`, `getMixpanel()`, `getSupabase()` via their singleton setters  

## What to Avoid

❌ Don't test types files — TypeScript compiler does this automatically  
❌ Don't test CSS/styling — use visual testing tools instead  
❌ Don't mock too deeply — test external services at the `fetch` boundary  
❌ Don't use `jest` — use `vitest` for native Vite compatibility  
❌ Don't test private component state — test behavior and rendered output  
