import { showLocalNotice } from '../stores/annotations'

type Translate = (
  key: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: Record<string, any> | undefined
) => string

// The Penpot plugin iframe may lack the clipboard-write policy.
const copyWithTextarea = (text: string): boolean => {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '-9999px'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)

  try {
    textarea.select()
    textarea.setSelectionRange(0, text.length)

    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    document.body.removeChild(textarea)
  }
}

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)

      return true
    }
  } catch {
    // fall through to the textarea fallback
  }

  return copyWithTextarea(text)
}

export const copyWithNotice = async (
  text: string,
  successKey: string,
  t: Translate
): Promise<boolean> => {
  const isCopied = await copyToClipboard(text)

  showLocalNotice(
    isCopied
      ? { type: 'SUCCESS', message: t(successKey), timer: 4000 }
      : { type: 'WARNING', message: t('handoff.copy.failed'), timer: 8000 }
  )

  return isCopied
}
