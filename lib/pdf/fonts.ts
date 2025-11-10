import path from 'path'
import { Font } from '@react-pdf/renderer'

export const FONT_FAMILY = 'NotoSansJP'

const getFontSrc = (fileName: string) => {
  if (typeof window !== 'undefined') {
    return `/fonts/${fileName}`
  }
  return path.join(process.cwd(), 'public', 'fonts', fileName)
}

let fontsRegistered = false

export const ensureJapaneseFonts = () => {
  if (fontsRegistered) return

  Font.register({
    family: FONT_FAMILY,
    fonts: [
      { src: getFontSrc('NotoSansJP-Regular.ttf'), fontWeight: 'normal' },
      { src: getFontSrc('NotoSansJP-Bold.ttf'), fontWeight: 'bold' },
    ],
  })

  fontsRegistered = true
}
