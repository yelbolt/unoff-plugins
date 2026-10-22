import { loadStyle, saveStyle } from '../../canvas/annotations/style'
import { surfaceError } from './surfaceError'

// GET_ANNOTATION_STYLE -> ANNOTATION_STYLE_LOADED
export const getAnnotationStyle = (): void => {
  try {
    penpot.ui.sendMessage({
      type: 'ANNOTATION_STYLE_LOADED',
      data: loadStyle(),
    })
  } catch (error) {
    surfaceError(error)
  }
}

// SET_ANNOTATION_STYLE (AnnotationStyle) -> ANNOTATION_STYLE_SAVED
export const setAnnotationStyle = (style: unknown): void => {
  try {
    penpot.ui.sendMessage({
      type: 'ANNOTATION_STYLE_SAVED',
      data: saveStyle(style),
    })
  } catch (error) {
    surfaceError(error)
  }
}
