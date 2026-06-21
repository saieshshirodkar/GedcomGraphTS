import type { CanvasRenderingContext2D } from 'canvas'
import { PersonNode } from '../src/graph/gedcom/nodes/PersonNode'
import { Person } from '../src/graph/gedcom/model/types'
import {
  S,
  MINI_FONT,
  NAME_FONT,
  TITLE_FONT,
  DATE_FONT,
  CARD_PAD_X,
  CARD_PAD_TOP,
  CARD_PAD_BOT,
  LINE_H_NAME,
  LINE_H_TITLE,
  LINE_H_DATE,
  CARD_MIN_W,
} from './scale'

export function buildNameLines(pn: PersonNode): string[] {
  const names = pn.person.getNames()
  if (names.length === 0) return ['[No name]']

  const name = names[0]
  const value = name.getDisplayValue().trim()
  const lines: string[] = []
  const slashPos = value.indexOf('/')
  const lastSlashPos = value.lastIndexOf('/')

  let given
  if (slashPos === 0 && lastSlashPos === 1 && value.length > 2) {
    given = value.substring(2)
  } else if (slashPos === 0 && lastSlashPos > 1) {
    given = value.substring(1, lastSlashPos)
  } else if (slashPos > 0) {
    given = value.substring(0, slashPos)
  } else {
    given = value
  }

  given = given.trim()
  if (given) lines.push(given)
  else lines.push('[No name]')

  if (pn.duplicate) {
    if (lines.length > 0) lines[lines.length - 1] += ' (2)'
    else lines.push('(2)')
  }

  return lines.length > 0 ? lines : ['[No name]']
}

export function buildTitles(person: Person): string {
  return person
    .getEventsFacts()
    .filter(ef => ef.getTag() === 'TITL' && ef.getValue())
    .map(ef => ef.getValue()!)
    .join('\n')
}

export function isDead(person: Person): boolean {
  return person.getEventsFacts().some(ef => ef.getTag() === 'DEAT' || ef.getTag() === 'BURI')
}

export function buildDates(person: Person): string[] {
  const facts = person.getEventsFacts()
  let birth: string | null = null
  let christening: string | null = null
  let death: string | null = null

  for (const fact of facts) {
    if (fact.getTag() === 'BIRT' && fact.getDate()) {
      birth = fact.getDate()
      break
    }
  }
  if (!birth) {
    for (const fact of facts) {
      if ((fact.getTag() === 'CHR' || fact.getTag() === 'BAPM') && fact.getDate()) {
        christening = fact.getDate()
        break
      }
    }
  }
  for (const fact of facts) {
    if (fact.getTag() === 'DEAT' && fact.getDate()) {
      death = fact.getDate()
      break
    }
  }

  const lines: string[] = []
  let birthLine = ''
  if (birth) birthLine = '\u2605 ' + birth
  else if (christening) birthLine = '\u2248 ' + christening // ≈

  let deathLine = ''
  if (death) deathLine = '\u271B ' + death // ✛

  if (birthLine && deathLine) {
    if (birthLine.length > 7 || deathLine.length > 7) {
      lines.push(birthLine)
      lines.push(deathLine)
    } else {
      lines.push(birthLine + '  ' + deathLine)
    }
  } else if (birthLine) {
    lines.push(birthLine)
  } else if (deathLine) {
    lines.push(deathLine)
  } else {
    // If no main dates, try to find any date
    for (const fact of facts) {
      const d = fact.getDate()
      if (d) {
        lines.push(d)
        break
      }
    }
  }
  return lines
}

export function measureNode(pn: PersonNode, ctx: CanvasRenderingContext2D): void {
  if (pn.mini) {
    const txt = pn.amount > 100 ? '100+' : String(pn.amount)
    ctx.font = MINI_FONT
    const m = ctx.measureText(txt)
    pn.width = (m.width + Math.round(14 * S)) / S
    pn.height = (Math.round(14 * S) + Math.round(8 * S)) / S
  } else {
    const nameLines = buildNameLines(pn)
    ctx.font = NAME_FONT
    const nameW = nameLines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0)

    const titles = buildTitles(pn.person)
    ctx.font = TITLE_FONT
    const titleLines = titles ? titles.split('\n') : []
    const titleW = titleLines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0)

    const dateLines = buildDates(pn.person)
    ctx.font = DATE_FONT
    const dateW = dateLines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0)

    const contentW = Math.max(nameW, titleW, dateW)
    pn.width = Math.max(CARD_MIN_W, contentW + CARD_PAD_X * 2 + 1) / S

    let totalH = CARD_PAD_TOP + nameLines.length * LINE_H_NAME
    if (titleLines.length > 0) totalH += titleLines.length * LINE_H_TITLE
    if (dateLines.length > 0) totalH += dateLines.length * LINE_H_DATE
    totalH += CARD_PAD_BOT
    pn.height = totalH / S
  }
}
