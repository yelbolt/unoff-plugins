---
name: payment-systems
description: Two monetization options — Option A (figma.payments API with native checkout, Figma-only) and Option B (Lemon Squeezy license keys via CORS worker, cross-platform). For cross-platform plugins use Option B. Use when choosing a payment model, wiring checkout, or implementing license key activate/validate/deactivate flows.
---

# Payment Systems

## Overview

Two mutually exclusive payment systems are available. The template includes code for both — **you must choose one and configure it before shipping**. Mixing the two is not supported.

| | Figma Built-in Payments | Lemon Squeezy |
|---|---|---|
| **Where** | Canvas (Figma API) | UI (external REST API) |
| **User flow** | Native Figma checkout overlay | License key entry form |
| **Manifest** | `"payments"` permission required | No change needed |
| **Revenue split** | Figma takes a fee | Direct (no platform fee) |
| **Trial support** | `TRIAL_ENDED` interstitial | Custom logic (already wired) |
| **Key files** | `src/bridges/plans/payProPlan.ts` | `src/app/external/license/` |

---

## Option A — Figma Built-in Payments

> **Figma only** — `figma.payments` is a Figma-specific API. This option is not available on Penpot, Sketch, or Framer. For cross-platform plugins, use Option B (Lemon Squeezy) instead.

Uses the native `figma.payments` Canvas API. Figma handles the checkout UI.

### Manifest

`"payments"` must be present in `manifest.json`:

```json
{
  "permissions": ["payments", "currentuser"]
}
```

### Payment Status

Read the current user's payment status from the Canvas context:

```typescript
figma.payments?.status.type
// 'PAID' | 'NOT_PAID' | 'UNKNOWN'
```

`'UNKNOWN'` means the status could not be determined (e.g. offline). Treat it as unpaid.

### Triggering Checkout

`src/bridges/plans/payProPlan.ts` handles checkout initiation:

```typescript
const payProPlan = async () => {
  await figma.payments
    ?.initiateCheckoutAsync({
      interstitial: 'SKIP', // ← choose one (see below)
    })
    .then(() => {
      if (figma.payments?.status.type === 'PAID')
        figma.ui.postMessage({
          type: 'WELCOME_TO_PRO',
          data: {
            status: figma.payments.status.type,
            id: figma.currentUser?.id,
          },
        })
    })
}
```

### Interstitial Options

The `interstitial` value controls what Figma shows **before** the checkout screen.

| Value | Behavior | When to use |
|---|---|---|
| `'SKIP'` | Goes directly to checkout, no interstitial | Triggered by an explicit "Upgrade" button click |
| `'PAID_FEATURE'` | Shows an upsell modal explaining the feature is paid | When the user tries to use a locked feature |
| `'UPGRADE'` | Shows an upgrade modal for seat-based plans | Multi-seat / team license plugins |
| `'TRIAL_ENDED'` | Shows a trial-ended modal before checkout | After `checkTrialStatus` returns `'EXPIRED'` |

Example — show upsell when the user hits a locked feature:

```typescript
// Canvas side: triggered by PAY_PRO_PLAN message
import { payProPlan } from './plans/payProPlan'

// In loadUI.ts action map:
PAY_PRO_PLAN: () => payProPlan('PAID_FEATURE'),
```

```typescript
// payProPlan.ts (adapted to accept interstitial as parameter)
const payProPlan = async (
  interstitial: 'SKIP' | 'PAID_FEATURE' | 'UPGRADE' | 'TRIAL_ENDED' = 'SKIP'
) => {
  await figma.payments?.initiateCheckoutAsync({ interstitial })
    .then(() => {
      if (figma.payments?.status.type === 'PAID')
        figma.ui.postMessage({ type: 'WELCOME_TO_PRO', data: { ... } })
    })
}
```

### Plan Status Check

`src/bridges/checks/checkTrialStatus.ts` resolves the full plan state:

```typescript
// Returns 'PAID' | 'UNPAID' | 'NOT_PAID' | 'UNKNOWN'
const status = await checkTrialStatus()
```

It combines the Figma payment status with the local trial state:

```typescript
// Simplified logic inside checkTrialStatus.ts
if (trialStatus === 'PENDING' || !globalConfig.plan.isProEnabled)
  return 'PAID'
else
  return figma.payments?.status.type ?? 'UNPAID'
```

### Activation Checklist

- [ ] `"payments"` is in `manifest.json` permissions
- [ ] `globalConfig.plan.isProEnabled` is `true`
- [ ] Choose the right `interstitial` for each entry point
- [ ] Handle `'UNKNOWN'` status gracefully in the UI

---

## Option B — Lemon Squeezy (License Keys)

Uses the Lemon Squeezy REST API via a CORS proxy worker. The user enters a license key manually.

### Environment Variables

```env
# .env.local
VITE_LEMONSQUEEZY_URL='https://api.lemonsqueezy.com/v1'
VITE_CORS_WORKER_URL='https://cors.your-worker.workers.dev'
```

### Files

```
src/app/external/license/
  activateUserLicenseKey.ts    # Activate a key + store in clientStorage
  desactivateUserLicenseKey.ts # Deactivate a key + clear clientStorage
  validateUserLicenseKey.ts    # Validate an existing key + instance
```

All three use the same CORS proxy pattern:

```typescript
fetch(
  corsWorkerUrl + '?' + encodeURIComponent(
    `${storeApiUrl}/licenses/activate?license_key=${licenseKey}&instance_name=...`
  ),
  { method: 'POST', headers: { Accept: 'application/json', ... } }
)
```

### Activation Flow

```
UI: user submits license key
  → activateUserLicenseKey({ corsWorkerUrl, storeApiUrl, licenseKey, instanceName, platform })
    → POST /licenses/activate
      → on success: sendPluginMessage SET_ITEMS
          { user_license_key, user_license_instance_id, user_license_instance_name }
        → Canvas stores keys in clientStorage
```

### Subsequent Loads

`src/bridges/checks/checkUserLicense.ts` reads the stored key on startup:

```typescript
const checkUserLicense = async () => {
  const licenseKey = await figma.clientStorage.getAsync('user_license_key')
  const instanceId = await figma.clientStorage.getAsync('user_license_instance_id')

  if (licenseKey && instanceId)
    return figma.ui.postMessage({
      type: 'CHECK_USER_LICENSE',
      data: { licenseKey, instanceId },
    })
}
```

The UI then calls `validateUserLicenseKey()` to confirm the key is still valid.

### Deactivation Flow

```
UI: user clicks "Remove license"
  → desactivateUserLicenseKey({ corsWorkerUrl, storeApiUrl, licenseKey, instanceId })
    → POST /licenses/deactivate
      → on success: sendPluginMessage DELETE_ITEMS
          ['user_license_key', 'user_license_instance_id', 'user_license_instance_name']
```

### Activation Checklist

- [ ] `"payments"` is **removed** from `manifest.json` permissions (not needed)
- [ ] `VITE_LEMONSQUEEZY_URL` and `VITE_CORS_WORKER_URL` are set in `.env.local`
- [ ] `globalConfig.urls.storeApiUrl` is set (reads from `VITE_LEMONSQUEEZY_URL`)
- [ ] `globalConfig.plan.isProEnabled` is `true`
- [ ] A UI component exists to collect and submit the license key

---

## Making Your Choice

Ask yourself:

1. **Do you want Figma to handle the transaction?** → Figma built-in payments
2. **Do you already sell licenses on Lemon Squeezy / want direct revenue?** → Lemon Squeezy
3. **Do you want a zero-friction checkout (no key copy-paste)?** → Figma built-in payments
4. **Do you need cross-platform license portability?** → Lemon Squeezy

> **⚠️ Choose exactly one system. Do not leave both wired up simultaneously.**
> The `"payments"` manifest permission must match the chosen system.
