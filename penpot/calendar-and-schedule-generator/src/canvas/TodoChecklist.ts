import { Board, Ellipse, Text } from '@penpot/plugin-types'
import { bodyFontFamily, darkColor } from './styles'

export default class TodoChecklist {
  node: Board

  constructor({ items }: { items: string[] }) {
    this.node = this.makeNode(items)
  }

  private makeNode(items: string[]): Board {
    const container = penpot.createBoard()
    container.name = 'To-do checklist'
    container.resize(240, 10)
    container.fills = [{ fillColor: '#FFFFFF', fillOpacity: 0.5 }]
    container.strokes = [
      {
        strokeColor: darkColor,
        strokeOpacity: 0.05,
        strokeAlignment: 'inner',
        strokeWidth: 1,
        strokeStyle: 'solid',
      },
    ]
    container.borderRadius = 12

    const flex = container.addFlexLayout()
    flex.dir = 'column'
    flex.verticalSizing = 'auto'
    flex.horizontalSizing = 'fit-content'
    flex.topPadding = 12
    flex.leftPadding = 12
    flex.bottomPadding = 12
    flex.rightPadding = 12
    flex.rowGap = 8

    items.forEach((text) => container.appendChild(this.makeRow(text)))

    return container
  }

  private makeRow(text: string): Board {
    const row = penpot.createBoard() as Board
    row.name = '_row'
    row.fills = []

    const flex = row.addFlexLayout()
    flex.dir = 'row'
    flex.verticalSizing = 'auto'
    flex.horizontalSizing = 'fill'
    flex.alignItems = 'center'
    flex.columnGap = 8

    // Bullet
    const bullet = penpot.createEllipse() as Ellipse
    bullet.name = '_bullet'
    bullet.resize(8, 8)
    bullet.fills = [{ fillColor: darkColor, fillOpacity: 0.2 }]
    row.appendChild(bullet)

    // Label
    const label = penpot.createText(text) as Text
    label.name = '_label'
    label.fontFamily = bodyFontFamily
    label.fontWeight = 'Medium'
    label.fontSize = '12'
    label.fills = [{ fillColor: darkColor }]
    label.growType = 'auto-height'
    row.appendChild(label)
    if (label.layoutChild) label.layoutChild.horizontalSizing = 'fill'

    return row
  }
}
