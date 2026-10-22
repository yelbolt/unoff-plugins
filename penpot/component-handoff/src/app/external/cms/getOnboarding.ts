import { Platform, Editor } from '../../types/app'
import { buildHeaders } from '.'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NotionItem = Record<string, any>

const PLATFORM_LABELS: Record<Platform, string> = {
  figma: 'Figma',
  penpot: 'Penpot',
  sketch: 'Sketch',
  framer: 'Framer',
}

const EDITOR_LABELS: Record<Editor, string> = {
  figma: 'Figma',
  figjam: 'FigJam',
  dev: 'Dev',
  dev_vscode: 'Dev',
  buzz: 'Buzz',
  penpot: 'Penpot',
  sketch: 'Sketch',
  framer: 'Framer',
}

const getOnboarding = (
  workerUrl: string,
  dbId: string,
  platform: Platform,
  editor: Editor
): Promise<NotionItem[]> =>
  fetch(`${workerUrl}/?action=get_announcements&database_id=${dbId}`, {
    headers: buildHeaders(),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.message === 'The database could not be queried')
        throw new Error(data.message)

      const platformLabel = PLATFORM_LABELS[platform]
      const editorLabel = EDITOR_LABELS[editor]

      return (data.announcements as NotionItem[])
        .filter((item) =>
          item.properties['Platforms']?.multi_select?.some(
            (entry: { name: string }) => entry.name === platformLabel
          )
        )
        .filter((item) =>
          item.properties['Editors']?.multi_select?.some(
            (entry: { name: string }) => entry.name === editorLabel
          )
        )
    })

export default getOnboarding
