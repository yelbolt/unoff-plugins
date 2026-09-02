// Reads stored license key and instance ID and forwards them to the UI
// for remote validation. Skips silently if no key is stored.
const checkUserLicense = async () => {
  const licenseKey = penpot.localStorage.getItem('user_license_key')
  const instanceId = penpot.localStorage.getItem('user_license_instance_id')

  if (licenseKey && instanceId)
    return penpot.ui.sendMessage({
      type: 'CHECK_USER_LICENSE',
      data: {
        licenseKey: licenseKey,
        instanceId: instanceId,
      },
    })
  return true
}

export default checkUserLicense
