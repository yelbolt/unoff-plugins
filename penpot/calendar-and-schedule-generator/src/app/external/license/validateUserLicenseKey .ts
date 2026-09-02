const validateUserLicenseKey = async ({
  corsWorkerUrl,
  storeApiUrl,
  licenseKey,
  instanceId,
}: {
  corsWorkerUrl: string
  storeApiUrl: string
  licenseKey: string
  instanceId: string
}): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    fetch(
      corsWorkerUrl +
        '?' +
        encodeURIComponent(
          `${storeApiUrl}/licenses/validate?license_key=${licenseKey}&instance_id=${instanceId}`
        ),
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
      .then((response) => response.json())
      .then((data) => {
        if (data.valid) return resolve(data.valid)
        if (data.error) throw new Error(data.error)
      })
      .catch((error) => {
        console.error(error)
        return reject(error)
      })
  })
}

export default validateUserLicenseKey
