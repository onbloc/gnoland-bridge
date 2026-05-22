import BigNumber from 'bignumber.js'

const truncate = (text: string = '', [h, t]: number[] = [8, 6]): string => {
  const head = text.slice(0, h)
  const tail = text.slice(-1 * t, text.length)
  return text.length > h + t ? [head, tail].join('...') : text
}

const jsonTryParse = <T>(value: string): T | undefined => {
  try {
    return JSON.parse(value) as T
  } catch {
    return undefined
  }
}

const setComma = (str: string | number): string => {
  const parts = String(str).split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.')
}

const delComma = (str: string | number): string => {
  return String(str).replace(/,/g, '')
}

const extractNumber = (str: string): string => str.replace(/\D+/g, '')

const toBignumber = (value?: string): BigNumber => new BigNumber(value || 0)

export default {
  truncate,
  jsonTryParse,
  setComma,
  delComma,
  extractNumber,
  toBignumber,
}
