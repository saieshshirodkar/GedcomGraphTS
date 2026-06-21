import { Parser } from '../src/vendor/gedcom-parser/index'
import { Graph } from '../src/graph/gedcom/Graph'
import type { CanvasRenderingContext2D } from 'canvas'
import { PAD, COLOR_BG } from '../render/colors'
import { S, initScale } from '../render/scale'
import { measureNode } from '../render/measure'
import { drawLines, drawBonds, drawDuplicateLines, drawPersonNodes } from '../render/draw'
import { mapParsedGedcom, buildGedcom } from '../render/gedcom-mock'
import Panzoom from '@panzoom/panzoom'
import gedcomText from './shirodkar.ged?raw'

function main(): void {
  initScale(2)

  const parsed = Parser.parse(gedcomText)
  const { people, families } = mapParsedGedcom(parsed)
  const gedcom = buildGedcom(people, families)

  const fulcrumId = 'I113'
  const fulcrum = gedcom.getPerson(fulcrumId)
  if (!fulcrum) {
    console.error('Person ' + fulcrumId + ' not found')
    return
  }
  console.log('Fulcrum:', fulcrum.getNames()[0]?.getDisplayValue() ?? fulcrum.getId())

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

  const offscreen = document.createElement('canvas')
  offscreen.width = 1000
  offscreen.height = 100
  const dummyCtx = offscreen.getContext('2d')!
  for (const pn of graph.getPersonNodes()) {
    measureNode(pn, dummyCtx as any as CanvasRenderingContext2D)
  }

  graph.initNodes()

  if (graph.needMaxBitmapSize()) graph.setMaxBitmapSize(1000)

  graph.placeNodes()

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const imgW = Math.round(graph.getWidth() * S) + Math.round(PAD * S) * 2
  const imgH = Math.round(graph.getHeight() * S) + Math.round(PAD * S) * 2

  const canvas = document.getElementById('tree') as HTMLCanvasElement
  canvas.width = Math.round(imgW * dpr)
  canvas.height = Math.round(imgH * dpr)
  canvas.style.width = imgW + 'px'
  canvas.style.height = imgH + 'px'
  const ctx = canvas.getContext('2d')!

  ctx.scale(dpr, dpr)
  ctx.fillStyle = COLOR_BG
  ctx.fillRect(0, 0, imgW, imgH)
  ctx.translate(Math.round(PAD * S), Math.round(PAD * S))

  const rctx = ctx as unknown as CanvasRenderingContext2D
  drawLines(rctx, graph)
  drawBonds(rctx, graph)
  drawDuplicateLines(rctx, graph)
  drawPersonNodes(rctx, graph)

  console.log(`Rendered: ${imgW}x${imgH} scale=${S} dpr=${dpr}`)

  const container = document.getElementById('container')!
  const initZoom = Math.min(container.clientWidth / imgW, container.clientHeight / imgH, 1)
  const panzoom = Panzoom(canvas, {
    maxScale: dpr,
    minScale: Math.min(0.05, initZoom * 0.3),
    contain: 'outside',
    canvas: true,
    startScale: initZoom,
    startX: (container.clientWidth - imgW * initZoom) / 2,
    startY: (container.clientHeight - imgH * initZoom) / 2,
  })
  container.addEventListener('wheel', panzoom.zoomWithWheel.bind(panzoom), { passive: false })
  canvas.addEventListener('dblclick', panzoom.zoomIn.bind(panzoom))
}

try {
  main()
} catch (e) {
  console.error(e)
}
