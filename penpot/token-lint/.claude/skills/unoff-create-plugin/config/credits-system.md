---
name: credits-system
description: Credits quota system using the $creditsCount atom, checkCredits bridge, limitsMapping, and renewal logic (period and version bump). Use when adding feature usage limits, wiring a feature to a credit gate, or implementing the isReached → isBlocked pattern.
---

# Credits System

## Overview

Credits are a soft usage quota that renews periodically. Unlike pro gating, credit-gated features are accessible to all users up to a limit — then blocked until the next renewal window. The system is disabled by default.

```
Canvas: checkCredits.ts → clientStorage → CHECK_CREDITS message
                                                   ↓
UI: $creditsCount atom  ←  CHECK_CREDITS handler
                                ↓
Component: isReached($creditsCount.get()) → isBlocked prop
```

---

## Enabling the System

In `global.config.ts`:

```typescript
plan: {
  isCreditsEnabled: true,            // ← flip this on
  creditsLimit: 250,                 // credits per period
  creditsRenewalPeriodHours: 24,     // renewal interval (takes priority over days)
  creditsRenewalPeriodDays: 1,       // fallback if hours is undefined
},
versions: {
  creditsVersion: '2025.12',         // bump to reset all users on next load
},
```

---

## Canvas Side — `checkCredits.ts`

Called once at startup via `CHECK_CREDITS` in `loadUI.ts`. Reads and resolves credits from Canvas storage, handling four cases:

> **Platform note** — Storage calls are `figma.clientStorage.getAsync/setAsync` on Figma and `penpot.localStorage.getItem/setItem` on Penpot. The logic and message types are identical. See [canvas/penpot/data-storage.md](../canvas/penpot/data-storage.md) for Penpot storage patterns.

| Condition | Action |
|---|---|
| No renew date stored | Initialize: set `renewDate = now + period` |
| `renewDate <= now` (period expired) | Refill: reset count to `creditsLimit`, advance `renewDate` |
| Count is `NaN` (first ever use) | Initialize: set count to `creditsLimit` |
| `creditsVersion` mismatch | Reset: refill count, advance `renewDate`, update version |

Then posts to UI:

```typescript
figma.ui.postMessage({
  type: 'CHECK_CREDITS',
  data: {
    creditsCount: number,          // remaining credits
    creditsRenewalDate: number | null,  // ms timestamp of next refill
  },
})
```

**Storage keys** (same on both platforms — Figma: `figma.clientStorage`, Penpot: `penpot.localStorage`):

| Key | Value |
|---|---|
| `credits_count` | Remaining credits as string |
| `credits_renew_date` | Next refill timestamp as string (ms) |
| `credits_version` | Last seen `creditsVersion` |

---

## UI Side — `$creditsCount`

```typescript
// src/app/stores/credits.ts
import { atom } from 'nanostores'
export const $creditsCount = atom<number>(0)
```

**Receiving from Canvas** (in the `CHECK_CREDITS` message handler):

```typescript
import { $creditsCount } from '../../stores/credits'

case 'CHECK_CREDITS':
  $creditsCount.set(msg.data.creditsCount)
  // also store creditsRenewalDate if needed
  break
```

**Consuming a credit** (when the user performs a credit-consuming action):

```typescript
import { $creditsCount } from '../../stores/credits'
import { sendPluginMessage } from '../../utils/pluginMessage'

const consumeCredit = () => {
  const remaining = $creditsCount.get()
  if (remaining <= 0) return // guard, though UI should prevent this

  const updated = remaining - 1
  $creditsCount.set(updated)

  // Persist to Canvas clientStorage
  sendPluginMessage(
    {
      pluginMessage: {
        type: 'SET_ITEMS',
        items: [{ key: 'credits_count', value: updated.toString() }],
      },
    },
    '*'
  )
}
```

**Reading in components** (without subscribing):

```typescript
import { useStore } from '@nanostores/preact'
import { $creditsCount } from '../../stores/credits'

// In render:
const creditsCount = useStore($creditsCount)
```

---

## Connecting Credits to Feature Flags

Features are credit-gated by giving them a `limit` via `limitsMapping` in `global.config.ts`.

### Step 1 — Add a limit key to `globalConfig.limits`

```typescript
limits: {
  pageSize: 20,
  width: 640,
  // ...
  myFeatureLimit: 0,  // ← credits threshold for this feature
},
```

### Step 2 — Wire the feature to its limit in `limitsMapping`

```typescript
const limitsMapping: { [key: string]: keyof typeof globalConfig.limits } = {
  MY_FEATURE: 'myFeatureLimit',
}
```

After this, `globalConfig.features` runs:

```typescript
globalConfig.features.forEach((feature) => {
  const limitKey = limitsMapping[feature.name]
  if (limitKey && globalConfig.limits[limitKey] !== undefined)
    feature.limit = globalConfig.limits[limitKey]
})
```

This sets `feature.limit = 0` on `MY_FEATURE`.

### Step 3 — Block the feature in the component

`FeatureStatus.isReached(count)` returns `true` when `count >= feature.limit`. With `limit: 0`:

```typescript
// $creditsCount = 0 (exhausted)
feature.isReached(0)  // 0 >= 0 → true  → blocked

// $creditsCount = 5 (credits available)
feature.isReached(5)  // 5 >= 0 → true  → ← only call isReached when relevant
```

> The check is only meaningful when paired with a guard on `isCreditsEnabled`.
> Gate the call so `isReached` is only used when credits are actually relevant.

**In a component:**

```typescript
import { useStore } from '@nanostores/preact'
import { $creditsCount } from '../../stores/credits'

class MyComponent extends PureComponent<MyProps, MyState> {
  static features = (planStatus, config, service, editor) => ({
    MY_FEATURE: new FeatureStatus({
      features: config.features,
      featureName: 'MY_FEATURE',
      planStatus, currentService: service, currentEditor: editor,
    }),
  })

  // Declared right after `static features`, right before `constructor`.
  private get features() {
    return MyComponent.features(
      this.state.planStatus,
      this.props.config,
      this.state.service,
      this.state.editor
    )
  }

  render() {
    const creditsCount = useStore($creditsCount)

    const isCreditsExhausted =
      this.props.config.plan.isCreditsEnabled &&
      this.features.MY_FEATURE.isReached(creditsCount)

    return (
      <Button
        isBlocked={this.features.MY_FEATURE.isBlocked() || isCreditsExhausted}
        onUnblock={() => {
          // Show upsell or credits explanation
        }}
      >
        Run feature
      </Button>
    )
  }
}
```

When `$creditsCount` reaches `0`:

```
isReached(0)  // 0 >= 0 (limit) → true
isBlocked prop = true → button shows locked state
```

---

## Resetting Credits for All Users

Bump `creditsVersion` in `global.config.ts`:

```typescript
versions: {
  creditsVersion: '2026.01',  // was '2025.12'
}
```

On next load, `checkCredits.ts` detects the version mismatch → resets count to `creditsLimit` and advances `renewDate`. No manual migration needed.

---

## Configuration Reference

| Key | Type | Default | Description |
|---|---|---|---|
| `plan.isCreditsEnabled` | `boolean` | `false` | Enable the credits system |
| `plan.creditsLimit` | `number` | `250` | Credits per renewal period |
| `plan.creditsRenewalPeriodHours` | `number` | `24` | Renewal period in hours (priority) |
| `plan.creditsRenewalPeriodDays` | `number` | `1` | Renewal period in days (fallback) |
| `versions.creditsVersion` | `string` | `'2025.12'` | Bump to force-reset all users |

---

## Checklist

- [ ] `isCreditsEnabled: true` in `global.config.ts`
- [ ] `creditsLimit` and renewal period set to desired values
- [ ] Limit key added to `globalConfig.limits`
- [ ] Feature wired in `limitsMapping`
- [ ] `CHECK_CREDITS` handler sets `$creditsCount`
- [ ] Credit-consuming actions call `consumeCredit()` and persist via `SET_ITEMS`
- [ ] Components check `isReached(creditsCount)` only when `isCreditsEnabled`
