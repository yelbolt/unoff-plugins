import { buildHeaders } from '.'

const checkAnnouncementsVersion = (
  announcementsWorkerUrl: string,
  announcementsDbId: string
): Promise<string> =>
  fetch(
    `${announcementsWorkerUrl}/?action=get_version&database_id=${announcementsDbId}`,
    { headers: buildHeaders() }
  )
    .then((response) => response.json())
    .then((data) => {
      if (data.message === 'The database is not found')
        throw new Error(data.message)
      return data.version as string
    })

export default checkAnnouncementsVersion
