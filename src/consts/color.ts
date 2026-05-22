/**
 * Color tokens.
 *
 * These resolve to CSS variables defined in src/index.css, so values follow
 * the active theme (light/dark) automatically when used as CSS values
 * (style props, inline styles, or template strings interpolated into CSS).
 *
 * For programmatic comparisons (e.g. `color === '#fff'`) these strings are not
 * usable - migrate that code to className-based styling.
 */

const text = 'var(--text-primary)'
const textSecondary = 'var(--text-secondary)'
const textTertiary = 'var(--text-tertiary)'
const textMuted = 'var(--text-muted)'

const bg = 'var(--bg-base)'
const surface1 = 'var(--bg-surface-1)'
const surface2 = 'var(--bg-surface-2)'

const primary = 'var(--bg-brand)'
const primaryHover = 'var(--bg-brand-hover)'

const border1 = 'var(--border-1)'
const borderStrong = 'var(--border-strong)'

const white = 'var(--text-primary)'
const darkGray = surface2
const darkGray2 = surface1
const skyGray = textSecondary
const blueGray = textTertiary
const black = bg
const red = 'oklch(0.62 0.16 30)'
const orange = 'oklch(0.84 0.16 86)'
const footerBg = surface1

export default {
  text,
  textSecondary,
  textTertiary,
  textMuted,
  bg,
  surface1,
  surface2,
  primary,
  primaryHover,
  border1,
  borderStrong,

  white,
  darkGray,
  darkGray2,
  skyGray,
  blueGray,
  black,
  red,
  orange,
  footerBg,
}
