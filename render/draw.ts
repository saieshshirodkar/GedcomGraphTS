import type { CanvasRenderingContext2D } from 'canvas'
import { Graph } from '../src/graph/gedcom/engine/Graph'
import { PersonNode } from '../src/graph/gedcom/nodes/PersonNode'
import { CurveLine } from '../src/graph/gedcom/lines/CurveLine'
import { DuplicateLine } from '../src/graph/gedcom/lines/DuplicateLine'
import { Gender } from '../src/graph/gedcom/config/Util'
import {
  COLOR_BACK_ELEMENT,
  COLOR_MALE,
  COLOR_FEMALE,
  COLOR_UNDEFINED,
  COLOR_PARTNER,
  COLOR_TEXT,
  COLOR_TEXT_VEILED,
  COLOR_LINES,
  COLOR_HEARTH,
  COLOR_DEATH_RIBBON_WHITE,
  COLOR_DEATH_RIBBON_BLACK,
} from './colors'
import {
  S,
  MINI_FONT,
  NAME_FONT,
  TITLE_FONT,
  DATE_FONT,
  CARD_CORNER,
  CARD_BG_CORNER,
  BORDER_WIDTH,
  DEATH_RIBBON_SIZE,
  CARD_PAD_X,
  CARD_PAD_TOP,
  LINE_H_NAME,
  LINE_H_TITLE,
  LINE_H_DATE,
  sf,
  si,
} from './scale'
import { buildNameLines, buildDates, buildTitles, isDead } from './measure'

function getBorderColor(pn: PersonNode): string {
  const gender = Gender.getGender(pn.person)
  if (gender === Gender.MALE) return COLOR_MALE
  if (gender === Gender.FEMALE) return COLOR_FEMALE
  return COLOR_UNDEFINED
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function drawDeathRibbon(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const s = DEATH_RIBBON_SIZE / 22
  ctx.fillStyle = COLOR_DEATH_RIBBON_WHITE
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + 8 * s, y)
  ctx.lineTo(x + 22 * s, y + 14 * s)
  ctx.lineTo(x + 22 * s, y + 22 * s)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = COLOR_DEATH_RIBBON_BLACK
  ctx.beginPath()
  ctx.moveTo(x + 2 * s, y)
  ctx.lineTo(x + 6 * s, y)
  ctx.lineTo(x + 22 * s, y + 16 * s)
  ctx.lineTo(x + 22 * s, y + 20 * s)
  ctx.closePath()
  ctx.fill()
}

export function drawPersonNodes(ctx: CanvasRenderingContext2D, graph: Graph): void {
  for (const pn of graph.getPersonNodes()) {
    const x = si(pn.x)
    const y = si(pn.y)
    const w = si(pn.width)
    const h = si(pn.height)

    if (pn.mini) {
      const border = getBorderColor(pn)
      ctx.fillStyle = COLOR_BACK_ELEMENT
      roundRect(ctx, x, y, w, h, CARD_BG_CORNER)
      ctx.fill()
      ctx.strokeStyle = border
      ctx.lineWidth = BORDER_WIDTH
      roundRect(ctx, x, y, w, h, CARD_CORNER)
      ctx.stroke()
      ctx.fillStyle = COLOR_TEXT
      ctx.font = MINI_FONT
      const txt = pn.amount > 100 ? '100+' : String(pn.amount)
      const m = ctx.measureText(txt)
      ctx.fillText(txt, x + (w - m.width) / 2, y + (h + Math.round(11 * S) * 0.7) / 2)
      continue
    }

    const border = getBorderColor(pn)

    if (pn.acquired) {
      ctx.fillStyle = COLOR_PARTNER
    } else {
      ctx.fillStyle = COLOR_BACK_ELEMENT
    }
    roundRect(ctx, x, y, w, h, CARD_BG_CORNER)
    ctx.fill()

    ctx.strokeStyle = border
    ctx.lineWidth = BORDER_WIDTH
    roundRect(ctx, x, y, w, h, CARD_CORNER)
    ctx.stroke()

    if (isDead(pn.person)) {
      drawDeathRibbon(ctx, x + w - DEATH_RIBBON_SIZE, y)
    }

    const maxTextW = w - CARD_PAD_X * 2 + 2
    let currentY = y + CARD_PAD_TOP

    // Name
    const nameLines = buildNameLines(pn)
    ctx.fillStyle = COLOR_TEXT
    ctx.font = NAME_FONT
    for (let name of nameLines) {
      let nm = ctx.measureText(name)
      if (nm.width > maxTextW) {
        while (ctx.measureText(name + '...').width > maxTextW && name.length > 3)
          name = name.substring(0, name.length - 1)
        name += '...'
        nm = ctx.measureText(name)
      }
      ctx.fillText(name, x + (w - nm.width) / 2, currentY + Math.round(17 * S) * 0.8)
      currentY += LINE_H_NAME
    }

    // Titles
    const titles = buildTitles(pn.person)
    if (titles) {
      ctx.font = TITLE_FONT
      ctx.fillStyle = COLOR_TEXT
      for (let line of titles.split('\n')) {
        let tm = ctx.measureText(line)
        if (tm.width > maxTextW) {
          while (ctx.measureText(line + '...').width > maxTextW && line.length > 3)
            line = line.substring(0, line.length - 1)
          line += '...'
          tm = ctx.measureText(line)
        }
        ctx.fillText(line, x + (w - tm.width) / 2, currentY + Math.round(15 * S) * 0.8)
        currentY += LINE_H_TITLE
      }
    }

    // Dates
    const dateLines = buildDates(pn.person)
    if (dateLines.length > 0) {
      ctx.fillStyle = COLOR_TEXT_VEILED
      ctx.font = DATE_FONT
      for (let line of dateLines) {
        let dm = ctx.measureText(line)
        if (dm.width > maxTextW) {
          while (ctx.measureText(line + '...').width > maxTextW && line.length > 3)
            line = line.substring(0, line.length - 1)
          line += '...'
          dm = ctx.measureText(line)
        }
        ctx.fillText(line, x + (w - dm.width) / 2, currentY + Math.round(14 * S) * 0.8)
        currentY += LINE_H_DATE
      }
    }
  }
}

export function drawBonds(ctx: CanvasRenderingContext2D, graph: Graph): void {
  for (const bond of graph.getBonds()) {
    const x = si(bond.x)
    const y = si(bond.y)
    const w = si(bond.width)
    const h = si(bond.height)
    const cx = x + w / 2
    const cy = y + h / 2
    const d = Math.round((bond.marriageDate || bond.width >= 20 ? 8 : 6) * S)
    ctx.fillStyle = COLOR_HEARTH
    ctx.beginPath()
    ctx.arc(cx, cy, d / 2, 0, Math.PI * 2)
    ctx.fill()
  }
}

export function drawLines(ctx: CanvasRenderingContext2D, graph: Graph): void {
  ctx.strokeStyle = COLOR_LINES
  ctx.lineWidth = 2 * S
  ctx.setLineDash([])
  for (const group of graph.getLines()) {
    for (const line of group) {
      const x1 = sf(line.x1),
        y1 = sf(line.y1)
      const x2 = sf(line.x2),
        y2 = sf(line.y2)
      if (line instanceof CurveLine) {
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.bezierCurveTo(x1, y2, x2, y1, x2, y2)
        ctx.stroke()
      } else {
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }
    }
  }
  ctx.strokeStyle = '#555555'
  ctx.lineWidth = 1.5 * S
  ctx.setLineDash([4 * S])
  for (const group of graph.getBackLines()) {
    for (const line of group) {
      ctx.beginPath()
      ctx.moveTo(si(line.x1), si(line.y1))
      ctx.lineTo(si(line.x2), si(line.y2))
      ctx.stroke()
    }
  }
  ctx.setLineDash([])
}

export function drawDuplicateLines(ctx: CanvasRenderingContext2D, graph: Graph): void {
  for (const dl of graph.getDuplicateLines()) {
    const dlTyped = dl as DuplicateLine
    let c = '#999999'
    if (dlTyped.gender === Gender.MALE) c = COLOR_MALE
    else if (dlTyped.gender === Gender.FEMALE) c = COLOR_FEMALE
    ctx.strokeStyle = c
    ctx.lineWidth = 2 * S
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(sf(dlTyped.x1), sf(dlTyped.y1))
    ctx.quadraticCurveTo(sf(dlTyped.x3), sf(dlTyped.y3), sf(dlTyped.x2), sf(dlTyped.y2))
    ctx.stroke()
  }
}
