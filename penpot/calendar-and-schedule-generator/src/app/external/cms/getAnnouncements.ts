import { Platform } from '../../types/app'
import { buildHeaders } from '.'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NotionItem = Record<string, any>

const PLATFORM_LABELS: Record<Platform, string> = {
  figma: 'Figma',
  penpot: 'Penpot',
  sketch: 'Sketch',
  framer: 'Framer',
}

const getAnnouncements = (
  workerUrl: string,
  dbId: string,
  platform: Platform
): Promise<NotionItem[]> =>
  fetch(`${workerUrl}/?action=get_announcements&database_id=${dbId}`, {
    headers: buildHeaders(),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.message === 'The database could not be queried')
        throw new Error(data.message)

      const label = PLATFORM_LABELS[platform]
      return (data.announcements as NotionItem[]).filter((item) =>
        item.properties['Platforms']?.multi_select?.some(
          (entry: { name: string }) => entry.name === label
        )
      )
    })

export default getAnnouncements
