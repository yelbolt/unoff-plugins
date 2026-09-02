import { sendPluginMessage } from '../../utils/pluginMessage'

const desactivateUserLicenseKey = async ({
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
          `${storeApiUrl}/licenses/deactivate?license_key=${licenseKey}&instance_id=${instanceId}`
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
        if (data.error) throw new Error(data.error)
        if (data.deactivated) {
          sendPluginMessage(
            {
              pluginMessage: {
                type: 'DELETE_ITEMS',
                items: [
                  'user_license_key',
                  'user_license_instance_id',
                  'user_license_instance_name',
                ],
              },
            },
            '*'
          )
          return resolve(data.valid)
        }
      })
      .catch((error) => {
        console.error(error)
        return reject(error)
      })
  })
}

export default desactivateUserLicenseKey
