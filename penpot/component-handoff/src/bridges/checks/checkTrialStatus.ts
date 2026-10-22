import globalConfig from '../../global.config'

// Resolves trial and plan status from stored trial data.
// Returns 'PAID' when trial is active or pro is disabled, otherwise undefined
// (Penpot has no native payment API).
const checkTrialStatus = async () => {
  // ── Storage reads ─────────────────────────────────────────────────────
  const trialStartDate = penpot.localStorage.getItem('trial_start_date')
  const currentTrialVersion: string =
    penpot.localStorage.getItem('trial_version') ??
    globalConfig.versions.trialVersion
  const currentTrialTime: number = parseFloat(
    penpot.localStorage.getItem('trial_time') ?? '72'
  )

  // ── Consumed time + trial status ──────────────────────────────────────
  let consumedTime = 0,
    trialStatus = 'UNUSED'

  if (trialStartDate) {
    consumedTime =
      (new Date().getTime() - new Date(trialStartDate).getTime()) /
      1000 /
      (60 * 60)

    if (
      consumedTime <= currentTrialTime &&
      currentTrialVersion !== globalConfig.versions.trialVersion &&
      globalConfig.plan.isTrialEnabled
    )
      trialStatus = 'PENDING'
    else if (
      consumedTime >= globalConfig.plan.trialTime &&
      globalConfig.plan.isTrialEnabled
    )
      trialStatus = 'EXPIRED'
    else trialStatus = 'UNUSED'
  }

  // ── Plan status resolution ─────────────────────────────────────────────
  let planStatus

  if (trialStatus === 'PENDING' || !globalConfig.plan.isProEnabled)
    planStatus = 'PAID'
  else planStatus = undefined

  // ── Send result to UI ──────────────────────────────────────────────────
  penpot.ui.sendMessage({
    type: 'CHECK_TRIAL_STATUS',
    data: {
      planStatus: planStatus,
      trialStatus: trialStatus,
      trialRemainingTime: Math.ceil(
        currentTrialVersion !== globalConfig.versions.trialVersion
          ? currentTrialTime - consumedTime
          : globalConfig.plan.trialTime - consumedTime
      ),
    },
  })

  if (trialStatus === 'PENDING' || !globalConfig.plan.isProEnabled)
    return 'PAID'
  else return undefined
}

export default checkTrialStatus
