import globalConfig from '../../global.config'

const addHours = (date: Date, hours: number) => {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

// Reads and resolves the current credits state. Handles 4 cases:
// 1. No renew date stored → initialize
// 2. Renew period elapsed → refill and advance date
// 3. Count is NaN (first ever use) → initialize to limit
// 4. Credits version mismatch → reset count and advance date
const checkCredits = async () => {
  // ── Storage reads ─────────────────────────────────────────────────────
  const creditsCountStr = penpot.localStorage.getItem('credits_count')
  const renewDateStr = penpot.localStorage.getItem('credits_renew_date')
  const creditsVersion = penpot.localStorage.getItem('credits_version')

  const now = new Date()
  const periodHours =
    globalConfig.plan.creditsRenewalPeriodHours ??
    globalConfig.plan.creditsRenewalPeriodDays * 24

  let creditsCount =
    creditsCountStr !== null ? parseFloat(creditsCountStr) : NaN
  let renewDate: Date | null =
    renewDateStr !== null && !Number.isNaN(parseInt(renewDateStr, 10))
      ? new Date(parseInt(renewDateStr, 10))
      : null

  // ── Case 1: No renew date → initialize ────────────────────────────────
  if (renewDate === null) {
    const next = addHours(now, periodHours)
    penpot.localStorage.setItem('credits_renew_date', next.getTime().toString())
    renewDate = next
  }

  // ── Case 2: Period elapsed → refill ───────────────────────────────────
  if (renewDate && renewDate.getTime() <= now.getTime()) {
    penpot.localStorage.setItem(
      'credits_count',
      globalConfig.plan.creditsLimit.toString()
    )
    const next = addHours(now, periodHours)
    penpot.localStorage.setItem('credits_renew_date', next.getTime().toString())
    creditsCount = globalConfig.plan.creditsLimit
  }

  // ── Case 3: NaN count → initialize ────────────────────────────────────
  if (Number.isNaN(creditsCount)) {
    penpot.localStorage.setItem(
      'credits_count',
      globalConfig.plan.creditsLimit.toString()
    )
    creditsCount = globalConfig.plan.creditsLimit
  }

  // ── Case 4: Version mismatch → reset ──────────────────────────────────
  if (creditsVersion !== globalConfig.versions.creditsVersion) {
    penpot.localStorage.setItem(
      'credits_version',
      globalConfig.versions.creditsVersion
    )
    penpot.localStorage.setItem(
      'credits_count',
      globalConfig.plan.creditsLimit.toString()
    )
    const next = addHours(now, periodHours)
    penpot.localStorage.setItem('credits_renew_date', next.getTime().toString())
    creditsCount = globalConfig.plan.creditsLimit
    renewDate = next
  }

  // ── Send result to UI ──────────────────────────────────────────────────
  penpot.ui.sendMessage({
    type: 'CHECK_CREDITS',
    data: {
      creditsCount: creditsCount,
      creditsRenewalDate: renewDate?.getTime() ?? null,
    },
  })

  return creditsCount
}

export default checkCredits
