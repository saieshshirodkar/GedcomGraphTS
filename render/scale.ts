export let S = 4

export let NAME_FONT: string
export let TITLE_FONT: string
export let DATE_FONT: string
export let MINI_FONT: string
export let CARD_PAD_X: number
export let CARD_PAD_TOP: number
export let CARD_PAD_BOT: number
export let LINE_H_NAME: number
export let LINE_H_TITLE: number
export let LINE_H_DATE: number
export let CARD_MIN_W: number
export let CARD_CORNER: number
export let CARD_BG_CORNER: number
export let BORDER_WIDTH: number
export let DEATH_RIBBON_SIZE: number

export function initScale(s: number): void {
  S = s
  NAME_FONT = `bold ${Math.round(17 * S)}px sans-serif`
  TITLE_FONT = `italic ${Math.round(15 * S)}px sans-serif`
  DATE_FONT = `${Math.round(14 * S)}px sans-serif`
  MINI_FONT = `bold ${Math.round(11 * S)}px sans-serif`
  CARD_PAD_X = Math.round(6 * S)
  CARD_PAD_TOP = Math.round(5 * S)
  CARD_PAD_BOT = Math.round(6 * S)
  LINE_H_NAME = Math.round(21 * S)
  LINE_H_TITLE = Math.round(19 * S)
  LINE_H_DATE = Math.round(18 * S)
  CARD_MIN_W = Math.round(50 * S)
  CARD_CORNER = Math.round(3 * S)
  CARD_BG_CORNER = Math.round(4 * S)
  BORDER_WIDTH = Math.round(2 * S)
  DEATH_RIBBON_SIZE = Math.round(18 * S)
}

export function sf(v: number): number {
  return v * S
}
export function si(v: number): number {
  return Math.round(v * S)
}
