import { createCanvas } from 'canvas'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { Parser } from '../src/vendor/gedcom-parser/index'
import { Graph } from '../src/graph/gedcom/engine/Graph'
import { Person } from '../src/graph/gedcom/model/types'
import { PAD, COLOR_BG } from './colors'
import { S, initScale } from './scale'
import { measureNode } from './measure'
import { drawLines, drawBonds, drawDuplicateLines, drawPersonNodes } from './draw'
import { mapParsedGedcom, buildGedcom } from './gedcom-mock'

function main(): void {
  const args = process.argv.slice(2)
  const gedcomPath = args[0] || 'demo.ged'
  const outputPath = args[1] || 'family_tree.png'
  const scale = args[2] ? parseFloat(args[2]) : 4
  const fulcrumId = args[3] || null

  initScale(scale)

  const text = fs.readFileSync(path.resolve(gedcomPath), 'utf-8')
  const records = Parser.parse(text)
  const { people, families } = mapParsedGedcom(records)
  const gedcom = buildGedcom(people, families)

  let fulcrum: Person
  if (fulcrumId) {
    const found = gedcom.getPerson(fulcrumId)
    if (!found) {
      console.error(`Person ${fulcrumId} not found`)
      process.exit(1)
    }
    fulcrum = found
  } else {
    fulcrum = gedcom.getPeople()[0]
  }
  console.log(`Fulcrum: ${fulcrum.getNames()[0]?.getDisplayValue() ?? fulcrum.getId()}`)

  const graph = new Graph()
  graph
    .setGedcom(gedcom)
    .maxAncestors(3)
    .maxGreatUncles(2)
    .maxDescendants(10)
    .maxSiblingsNephews(2)
    .maxUnclesCousins(2)
    .displaySpouses(true)
    .displayNumbers(true)
    .displayDuplicateLines(true)
    .setLayoutDirection(true)

  graph.startFrom(fulcrum)

  const dummy = createCanvas(1000, 100)
  const dummyCtx = dummy.getContext('2d')
  for (const pn of graph.getPersonNodes()) {
    measureNode(pn, dummyCtx)
  }

  graph.initNodes()

  if (graph.needMaxBitmapSize()) graph.setMaxBitmapSize(1000)

  graph.placeNodes()

  const imgW = Math.round(graph.getWidth() * S) + Math.round(PAD * S) * 2
  const imgH = Math.round(graph.getHeight() * S) + Math.round(PAD * S) * 2

  const canvas = createCanvas(imgW, imgH)
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = COLOR_BG
  ctx.fillRect(0, 0, imgW, imgH)
  ctx.translate(Math.round(PAD * S), Math.round(PAD * S))

  drawLines(ctx, graph)
  drawBonds(ctx, graph)
  drawDuplicateLines(ctx, graph)
  drawPersonNodes(ctx, graph)

  const buffer = canvas.toBuffer('image/png')
  fs.writeFileSync(outputPath, buffer)
  console.log(`Saved: ${outputPath} (${imgW}x${imgH}) scale=${S}`)
}

main()
