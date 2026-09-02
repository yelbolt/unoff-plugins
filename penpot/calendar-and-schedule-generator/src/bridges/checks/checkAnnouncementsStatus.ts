// Compares the remote announcement version with the locally stored one and
// decides which dialog to show: onboarding, full dialog, notification, or nothing.
const checkAnnouncementsStatus = (remoteVersion: string) => {
  // ── Storage reads ─────────────────────────────────────────────────────
  const localVersion = penpot.localStorage.getItem('announcements_version')
  let isOnboardingRead = penpot.localStorage.getItem('is_onboarding_read')

  if (!isOnboardingRead) {
    penpot.localStorage.setItem('is_onboarding_read', 'false')
    isOnboardingRead = 'false'
  }

  // ── Version comparison ────────────────────────────────────────────────
  if (!localVersion && !remoteVersion)
    return {
      type: 'PUSH_ANNOUNCEMENTS_STATUS',
      data: { status: 'NO_ANNOUNCEMENTS' },
    }
  else if (!localVersion && isOnboardingRead !== 'true')
    return penpot.ui.sendMessage({
      type: 'PUSH_ONBOARDING_STATUS',
      data: { status: 'DISPLAY_ONBOARDING_DIALOG' },
    })
  else if (!localVersion)
    return penpot.ui.sendMessage({
      type: 'PUSH_ANNOUNCEMENTS_STATUS',
      data: { status: 'DISPLAY_ANNOUNCEMENTS_DIALOG' },
    })
  else {
    const remoteMajorVersion = remoteVersion.split('.')[0],
      remoteMinorVersion = remoteVersion.split('.')[1]

    const localMajorVersion = localVersion?.split('.')[0],
      localMinorVersion = localVersion?.split('.')[1]

    if (remoteMajorVersion !== localMajorVersion)
      return penpot.ui.sendMessage({
        type: 'PUSH_ANNOUNCEMENTS_STATUS',
        data: { status: 'DISPLAY_ANNOUNCEMENTS_DIALOG' },
      })

    if (remoteMinorVersion !== localMinorVersion)
      return penpot.ui.sendMessage({
        type: 'PUSH_ANNOUNCEMENTS_STATUS',
        data: { status: 'DISPLAY_ANNOUNCEMENTS_NOTIFICATION' },
      })

    return {
      type: 'PUSH_ANNOUNCEMENTS_STATUS',
      data: { status: 'NO_ANNOUNCEMENTS' },
    }
  }
}

export default checkAnnouncementsStatus
