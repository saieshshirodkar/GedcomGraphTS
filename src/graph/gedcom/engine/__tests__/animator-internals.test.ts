import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { MPerson, MFamily, build, run } from '../../__tests__/test-helper'
import { CurveLine } from '../../lines/CurveLine'
import { VerticalLine } from '../../lines/VerticalLine'
import { HorizontalLine } from '../../lines/HorizontalLine'
import { NextLine } from '../../lines/NextLine'
import { BackLine } from '../../lines/BackLine'
import { FamilyNode } from '../../nodes/FamilyNode'

describe('Animator internals', () => {
  it('initNodes populates lines array with correct types', () => {
    const parent = new MPerson('Parent /A/')
    const spouse = new MPerson('Spouse /A/')
    const fulcrumPerson = new MPerson('Fulcrum /A/')
    const child = new MPerson('Child /A/')
    new MFamily([parent], [spouse], [fulcrumPerson])
    new MFamily([fulcrumPerson], [new MPerson('Partner /A/')], [child])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse, child)
    graph.setMaxBitmapSize(2000)
    graph.startFrom(fulcrum)
    graph.initNodes()
    // After initNodes, lines should exist
    const lineTypes = graph.animator.lines.map(l => l.constructor)
    assert.ok(lineTypes.includes(CurveLine), 'CurveLine present')
    assert.ok(lineTypes.includes(VerticalLine), 'VerticalLine present')
    assert.ok(lineTypes.includes(HorizontalLine), 'HorizontalLine present')
  })

  it('distributeLines groups lines into lineGroups', () => {
    const parent = new MPerson('Parent /B/')
    const spouse = new MPerson('Spouse /B/')
    const fulcrumPerson = new MPerson('Fulcrum /B/')
    const child = new MPerson('Child /B/')
    new MFamily([parent], [spouse], [fulcrumPerson])
    new MFamily([fulcrumPerson], [new MPerson('Partner /B/')], [child])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse, child)
    graph.setMaxBitmapSize(2000)
    graph.startFrom(fulcrum)
    graph.initNodes()
    graph.placeNodes()
    assert.ok(graph.getLines().length > 0, 'lineGroups populated')
    for (const group of graph.getLines()) {
      assert.ok(group.size > 0, 'each group non-empty')
    }
  })

  it('biggestPathSize computed correctly after distributeLines', () => {
    const parent = new MPerson('Parent /C/')
    const spouse = new MPerson('Spouse /C/')
    const fulcrumPerson = new MPerson('Fulcrum /C/')
    const child = new MPerson('Child /C/')
    new MFamily([parent], [spouse], [fulcrumPerson])
    new MFamily([fulcrumPerson], [new MPerson('Partner /C/')], [child])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse, child)
    graph.setMaxBitmapSize(2000)
    run(graph, fulcrum)
    assert.ok(graph.getBiggestPathSize() > 0, 'biggestPathSize > 0')
  })

  it('duplicate lines are separate from regular lines', () => {
    const grandfather = new MPerson('Grandpa /D/')
    const grandmother = new MPerson('Grandma /D/')
    const dad = new MPerson('Dad /D/')
    const aunt = new MPerson('Aunt /D/')
    const mom = new MPerson('Mom /D/')
    const uncle = new MPerson('Uncle /D/')
    const fulcrumPerson = new MPerson('Fulcrum /D/')
    const spouse = new MPerson('Spouse /D/')
    const child = new MPerson('Child /D/')
    new MFamily([grandfather], [grandmother], [dad, aunt])
    new MFamily([dad], [mom], [fulcrumPerson])
    new MFamily([uncle], [aunt], [spouse])
    new MFamily([fulcrumPerson], [spouse], [child])
    const { graph, fulcrum } = build(fulcrumPerson, spouse, child, grandfather, grandmother, dad, aunt, mom, uncle)
    graph.displayDuplicateLines(true)
    graph.setMaxBitmapSize(2000)
    run(graph, fulcrum)
    // Duplicate lines are in a separate array
    assert.ok(graph.animator.duplicateLines.length > 0, 'duplicate lines exist')
    // Regular lines should not contain DuplicateLine instances
    for (const lg of graph.getLines()) {
      for (const line of lg) {
        assert.ok(!(line.constructor.name === 'DuplicateLine'), 'regular line groups should not contain DuplicateLine')
      }
    }
  })

  it('bonds list matches number of FamilyNodes with bonds', () => {
    const parent = new MPerson('Parent /E/')
    const spouse = new MPerson('Spouse /E/')
    const fulcrumPerson = new MPerson('Fulcrum /E/')
    new MFamily([parent], [spouse], [fulcrumPerson])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse)
    run(graph, fulcrum)
    const familyNodesWithBonds = graph.animator.nodes.filter(n => n instanceof FamilyNode && (n as FamilyNode).bond)
    assert.equal(graph.getBonds().length, familyNodesWithBonds.length, 'bonds count matches family nodes with bonds')
  })

  it('multi-marriage creates NextLine and BackLine', () => {
    const person = new MPerson('Person /F/')
    const spouse1 = new MPerson('Spouse1 /F/')
    const spouse2 = new MPerson('Spouse2 /F/')
    const spouse3 = new MPerson('Spouse3 /F/')
    new MFamily([person], [spouse1], [])
    new MFamily([person], [spouse2], [])
    new MFamily([person], [spouse3], [])
    const { graph, fulcrum } = build(person, spouse1, spouse2, spouse3)
    graph.setMaxBitmapSize(2000)
    graph.startFrom(fulcrum)
    graph.initNodes()
    const lineTypes = graph.animator.lines.map(l => l.constructor)
    assert.ok(lineTypes.includes(NextLine), 'NextLine present for multi-marriage')
    const backLineTypes = graph.animator.backLines.map(l => l.constructor)
    assert.ok(backLineTypes.includes(BackLine), 'BackLine present for multi-marriage')
  })

  it('union membership correctly assigned to all nodes', () => {
    const parent = new MPerson('Parent /G/')
    const spouse = new MPerson('Spouse /G/')
    const fulcrumPerson = new MPerson('Fulcrum /G/')
    new MFamily([parent], [spouse], [fulcrumPerson])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse)
    run(graph, fulcrum)
    for (const node of graph.animator.nodes) {
      assert.ok(node.union !== null || node.mini, `node ${node} has union or is mini`)
    }
  })

  it('backLineGroups populated when multi-marriage', () => {
    const person = new MPerson('Person /H/')
    const spouse1 = new MPerson('Spouse1 /H/')
    const spouse2 = new MPerson('Spouse2 /H/')
    const spouse3 = new MPerson('Spouse3 /H/')
    new MFamily([person], [spouse1], [])
    new MFamily([person], [spouse2], [])
    new MFamily([person], [spouse3], [])
    const { graph, fulcrum } = build(person, spouse1, spouse2, spouse3)
    graph.setMaxBitmapSize(2000)
    run(graph, fulcrum)
    assert.ok(graph.getBackLines().length > 0, 'backLineGroups populated')
  })

  it('placeNodes completes without error for 3-gen tree', () => {
    const grandparent = new MPerson('GP /I/')
    const parent = new MPerson('Parent /I/')
    const spouse = new MPerson('Spouse /I/')
    const fulcrumPerson = new MPerson('Fulcrum /I/')
    const child = new MPerson('Child /I/')
    new MFamily([grandparent], [], [parent])
    new MFamily([parent], [spouse], [fulcrumPerson])
    new MFamily([fulcrumPerson], [new MPerson('Partner /I/')], [child])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse, child, grandparent)
    graph.setMaxBitmapSize(2000)
    graph.startFrom(fulcrum)
    graph.initNodes()
    graph.placeNodes()
    assert.ok(graph.getWidth() > 0, 'width set after placeNodes')
    assert.ok(graph.getHeight() > 0, 'height set after placeNodes')
  })

  it('groupRows sorted by generation correctly', () => {
    const parent = new MPerson('Parent /J/')
    const spouse = new MPerson('Spouse /J/')
    const fulcrumPerson = new MPerson('Fulcrum /J/')
    const child = new MPerson('Child /J/')
    new MFamily([parent], [spouse], [fulcrumPerson])
    new MFamily([fulcrumPerson], [new MPerson('Partner /J/')], [child])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse, child)
    run(graph, fulcrum)
    for (let i = 1; i < graph.animator.groupRows.length; i++) {
      assert.ok(
        graph.animator.groupRows[i].generation > graph.animator.groupRows[i - 1].generation,
        `groupRows sorted: ${graph.animator.groupRows[i - 1].generation} < ${graph.animator.groupRows[i].generation}`,
      )
    }
  })

  it('initNodes survives single person with no relatives', () => {
    const p = new MPerson('Solo /K/')
    const { graph, fulcrum } = build(p)
    graph.startFrom(fulcrum)
    graph.initNodes()
    assert.ok(graph.animator.nodes.length >= 1, 'at least fulcrum node')
    assert.ok(graph.animator.personNodes.length >= 1, 'at least fulcrum person')
  })

  it('line distributeLines handles maxBitmapSize=0 gracefully', () => {
    const p = new MPerson('Solo /L/')
    const { graph, fulcrum } = build(p)
    graph.startFrom(fulcrum)
    graph.initNodes()
    graph.placeNodes()
    assert.equal(graph.getBiggestPathSize(), 0, 'biggestPathSize 0 when maxBitmapSize=0')
  })

  it('after placeNodes all lines have been updated', () => {
    const parent = new MPerson('Parent /M/')
    const spouse = new MPerson('Spouse /M/')
    const fulcrumPerson = new MPerson('Fulcrum /M/')
    const child = new MPerson('Child /M/')
    new MFamily([parent], [spouse], [fulcrumPerson])
    new MFamily([fulcrumPerson], [new MPerson('Partner /M/')], [child])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse, child)
    graph.setMaxBitmapSize(2000)
    run(graph, fulcrum)
    for (const lg of graph.getLines()) {
      for (const line of lg) {
        assert.ok(isFinite(line.x1) && isFinite(line.y1), 'line start finite')
        assert.ok(isFinite(line.x2) && isFinite(line.y2), 'line end finite')
      }
    }
  })
})
