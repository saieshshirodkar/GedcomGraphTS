import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { CurveLine } from '../CurveLine'
import { HorizontalLine } from '../HorizontalLine'
import { VerticalLine } from '../VerticalLine'
import { NextLine } from '../NextLine'
import { BackLine } from '../BackLine'
import { MPerson, MFamily, build, run } from '../../__tests__/test-helper'

function runWithLines(graph: import('../../engine/Graph').Graph, fulcrum: import('../../model/types').Person): void {
  graph.setMaxBitmapSize(2000)
  run(graph, fulcrum)
}

describe('Line types', () => {
  it('CurveLine connects parent to child', () => {
    // parent -> child (no spouse, single line)
    const parent = new MPerson('Parent /A/')
    const child = new MPerson('Child /A/')
    new MFamily([parent], [], [child])
    const { graph, fulcrum } = build(child, parent)
    runWithLines(graph, fulcrum)
    const curveLines = graph.animator.lines.filter(l => l instanceof CurveLine)
    assert.ok(curveLines.length > 0, 'at least one CurveLine')
    for (const cl of curveLines) {
      cl.update()
      assert.ok(
        isFinite(cl.x1) && isFinite(cl.y1) && isFinite(cl.x2) && isFinite(cl.y2),
        `CurveLine points finite: (${cl.x1},${cl.y1}) -> (${cl.x2},${cl.y2})`,
      )
    }
  })

  it('VerticalLine drops from bond to children', () => {
    const parent = new MPerson('Parent /B/')
    const spouse = new MPerson('Spouse /B/')
    const child = new MPerson('Child /B/')
    new MFamily([parent], [spouse], [child])
    const { graph, fulcrum } = build(child, parent, spouse)
    runWithLines(graph, fulcrum)
    const vertLines = graph.animator.lines.filter(l => l instanceof VerticalLine)
    assert.ok(vertLines.length > 0, 'at least one VerticalLine')
    for (const vl of vertLines) {
      vl.update()
      assert.ok(isFinite(vl.x1) && isFinite(vl.y1) && isFinite(vl.x2) && isFinite(vl.y2))
      assert.equal(vl.x1, vl.x2, 'VerticalLine x1 === x2')
      assert.ok(vl.y2 >= vl.y1, 'VerticalLine y2 >= y1')
    }
  })

  it('HorizontalLine connects two partners', () => {
    const parent = new MPerson('Parent /C/')
    const spouse = new MPerson('Spouse /C/')
    const child = new MPerson('Child /C/')
    new MFamily([parent], [spouse], [child])
    const { graph, fulcrum } = build(child, parent, spouse)
    runWithLines(graph, fulcrum)
    const horizLines = graph.animator.lines.filter(l => l instanceof HorizontalLine)
    assert.ok(horizLines.length > 0, 'at least one HorizontalLine')
    for (const hl of horizLines) {
      hl.update()
      assert.ok(isFinite(hl.x1) && isFinite(hl.y1) && isFinite(hl.x2) && isFinite(hl.y2))
    }
  })

  it('NextLine connects multi-marriage bonds to next partner', () => {
    const person = new MPerson('Person /D/')
    const spouse1 = new MPerson('Spouse1 /D/')
    const spouse2 = new MPerson('Spouse2 /D/')
    const child1 = new MPerson('Child1 /D/')
    const child2 = new MPerson('Child2 /D/')
    new MFamily([person], [spouse1], [child1])
    new MFamily([person], [spouse2], [child2])
    const { graph, fulcrum } = build(person, spouse1, spouse2, child1, child2)
    runWithLines(graph, fulcrum)
    const nextLines = graph.animator.lines.filter(l => l instanceof NextLine)
    assert.ok(nextLines.length > 0, 'at least one NextLine')
    for (const nl of nextLines) {
      nl.update()
      assert.ok(isFinite(nl.x1) && isFinite(nl.y1) && isFinite(nl.x2) && isFinite(nl.y2))
    }
  })

  it('BackLine connects multi-marriage bonds backwards', () => {
    const person = new MPerson('Person /E/')
    const spouse1 = new MPerson('Spouse1 /E/')
    const spouse2 = new MPerson('Spouse2 /E/')
    const spouse3 = new MPerson('Spouse3 /E/')
    const child1 = new MPerson('Child1 /E/')
    const child2 = new MPerson('Child2 /E/')
    const child3 = new MPerson('Child3 /E/')
    new MFamily([person], [spouse1], [child1])
    new MFamily([person], [spouse2], [child2])
    new MFamily([person], [spouse3], [child3])
    const { graph, fulcrum } = build(person, spouse1, spouse2, spouse3, child1, child2, child3)
    runWithLines(graph, fulcrum)
    const backLines = graph.animator.backLines.filter(l => l instanceof BackLine)
    assert.ok(backLines.length > 0, 'at least one BackLine')
    for (const bl of backLines) {
      bl.update()
      assert.ok(isFinite(bl.x1) && isFinite(bl.y1) && isFinite(bl.x2) && isFinite(bl.y2))
    }
  })

  it('DuplicateLine connects duplicate person nodes', () => {
    const grandfather = new MPerson('Grandpa /F/')
    const grandmother = new MPerson('Grandma /F/')
    const dad = new MPerson('Dad /F/')
    const aunt = new MPerson('Aunt /F/')
    const mom = new MPerson('Mom /F/')
    const uncle = new MPerson('Uncle /F/')
    const fulcrumPerson = new MPerson('Fulcrum /F/')
    const spouse = new MPerson('Spouse /F/')
    const child = new MPerson('Child /F/')
    new MFamily([grandfather], [grandmother], [dad, aunt])
    new MFamily([dad], [mom], [fulcrumPerson])
    new MFamily([uncle], [aunt], [spouse])
    new MFamily([fulcrumPerson], [spouse], [child])
    const { graph, fulcrum } = build(fulcrumPerson, spouse, child, grandfather, grandmother, dad, aunt, mom, uncle)
    graph.displayDuplicateLines(true)
    runWithLines(graph, fulcrum)
    const dupLines = graph.animator.duplicateLines
    if (dupLines.length > 0) {
      for (const dl of dupLines) {
        dl.update()
        assert.ok(isFinite(dl.x1) && isFinite(dl.y1) && isFinite(dl.x2) && isFinite(dl.y2))
        assert.ok(isFinite(dl.x3) && isFinite(dl.y3), 'DuplicateLine control point finite')
      }
    }
  })

  it('all lines grouped via distributeLines have finite coordinates', () => {
    const grandparent = new MPerson('GP /G/')
    const parent = new MPerson('Parent /G/')
    const spouse = new MPerson('Spouse /G/')
    const child = new MPerson('Child /G/')
    new MFamily([grandparent], [], [parent])
    new MFamily([parent], [spouse], [child])
    const { graph, fulcrum } = build(child, parent, spouse, grandparent)
    graph.setMaxBitmapSize(2000)
    run(graph, fulcrum)
    for (const group of graph.getLines()) {
      for (const line of group) {
        line.update()
        assert.ok(isFinite(line.x1) && isFinite(line.y1) && isFinite(line.x2) && isFinite(line.y2))
      }
    }
  })

  it('lines from getBackLines also have finite coords', () => {
    const person = new MPerson('Person /H/')
    const spouse1 = new MPerson('Spouse1 /H/')
    const spouse2 = new MPerson('Spouse2 /H/')
    new MFamily([person], [spouse1], [])
    new MFamily([person], [spouse2], [])
    const { graph, fulcrum } = build(person, spouse1, spouse2)
    graph.setMaxBitmapSize(2000)
    run(graph, fulcrum)
    for (const group of graph.getBackLines()) {
      for (const line of group) {
        line.update()
        assert.ok(isFinite(line.x1) && isFinite(line.y1) && isFinite(line.x2) && isFinite(line.y2))
      }
    }
  })

  it('lines compareTo sorts by leftmost x coordinate', () => {
    const curve1 = new CurveLine({ origin: { simpleCenterX: () => 10 }, personNode: { centerX: () => 20 } } as any)
    const curve2 = new CurveLine({ origin: { simpleCenterX: () => 100 }, personNode: { centerX: () => 200 } } as any)
    curve1.x1 = 10
    curve1.x2 = 20
    curve2.x1 = 100
    curve2.x2 = 200
    assert.ok(curve1.compareTo(curve2) < 0, 'curve1 is left of curve2')
    assert.ok(curve2.compareTo(curve1) > 0)
    assert.equal(curve1.compareTo(curve1), 0)
  })
})
