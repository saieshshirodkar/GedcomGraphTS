import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { MPerson, MFamily, build, run } from '../../__tests__/test-helper'

describe('Graph API', () => {
  it('getWidth returns positive number after layout', () => {
    const parent = new MPerson('Parent /A/')
    const spouse = new MPerson('Spouse /A/')
    const fulcrumPerson = new MPerson('Fulcrum /A/')
    new MFamily([parent], [spouse], [fulcrumPerson])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse)
    run(graph, fulcrum)
    assert.ok(graph.getWidth() > 0, 'getWidth() > 0')
  })

  it('getHeight returns positive number after layout', () => {
    const parent = new MPerson('Parent /B/')
    const spouse = new MPerson('Spouse /B/')
    const fulcrumPerson = new MPerson('Fulcrum /B/')
    new MFamily([parent], [spouse], [fulcrumPerson])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse)
    run(graph, fulcrum)
    assert.ok(graph.getHeight() > 0, 'getHeight() > 0')
  })

  it('getBiggestPathSize returns 0 when maxBitmapSize=0 (uninitialized)', () => {
    const parent = new MPerson('Parent /C/')
    const spouse = new MPerson('Spouse /C/')
    const fulcrumPerson = new MPerson('Fulcrum /C/')
    new MFamily([parent], [spouse], [fulcrumPerson])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse)
    run(graph, fulcrum)
    assert.equal(graph.getBiggestPathSize(), 0, 'biggestPathSize is 0 when maxBitmapSize is unset')
  })

  it('getBiggestPathSize grows with more ancestors after setMaxBitmapSize', () => {
    const grandparent = new MPerson('Grandparent /D/')
    const parent = new MPerson('Parent /D/')
    const spouse = new MPerson('Spouse /D/')
    const fulcrumPerson = new MPerson('Fulcrum /D/')
    new MFamily([grandparent], [], [parent])
    new MFamily([parent], [spouse], [fulcrumPerson])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse, grandparent)
    graph.maxAncestors(1)
    graph.setMaxBitmapSize(2000)
    run(graph, fulcrum)
    assert.ok(graph.getBiggestPathSize() > 0, `biggestPathSize > 0 for 3-gen tree, got ${graph.getBiggestPathSize()}`)
  })

  it('needMaxBitmapSize returns true before setMaxBitmapSize', () => {
    const p = new MPerson('Fulcrum /E/')
    const { graph, fulcrum } = build(p)
    run(graph, fulcrum)
    assert.ok(graph.needMaxBitmapSize(), 'needMaxBitmapSize() is true when maxBitmapSize=0')
  })

  it('needMaxBitmapSize returns false after setMaxBitmapSize', () => {
    const p = new MPerson('Fulcrum /F/')
    const { graph, fulcrum } = build(p)
    graph.setMaxBitmapSize(2000)
    run(graph, fulcrum)
    assert.equal(graph.needMaxBitmapSize(), false, 'needMaxBitmapSize() is false after set')
  })

  it('toString produces node lines with generation prefix', () => {
    const p = new MPerson('Fulcrum /G/')
    const { graph, fulcrum } = build(p)
    run(graph, fulcrum)
    const str = graph.toString()
    assert.ok(str.includes('0:'), 'toString starts with generation "0:"')
    assert.ok(str.includes('Fulcrum'), 'toString contains person name')
  })

  it('fulcrum field returns the starting person', () => {
    const parent = new MPerson('Parent /H/')
    const spouse = new MPerson('Spouse /H/')
    const fulcrumPerson = new MPerson('Fulcrum /H/')
    new MFamily([parent], [spouse], [fulcrumPerson])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse)
    run(graph, fulcrum)
    const f = graph.fulcrum
    assert.ok(f, 'fulcrum is set')
    assert.equal(f!.getId(), fulcrumPerson.getId())
  })

  it('chained config setters return Graph instance', () => {
    const p = new MPerson('Chained /I/')
    const { graph } = build(p)
    const r1 = graph.maxAncestors(2)
    const r2 = graph.maxDescendants(3)
    const r3 = graph.maxSiblingsNephews(4)
    const r4 = graph.maxGreatUncles(5)
    const r5 = graph.displayNumbers(true)
    const r6 = graph.displayDuplicateLines(true)
    const r7 = graph.showFamily(0)
    for (const r of [r1, r2, r3, r4, r5, r6, r7]) {
      assert.equal(r, graph, 'chained call returns Graph')
    }
  })

  it('getLines returns empty array before initNodes is called', () => {
    const p = new MPerson('BeforeInit /J/')
    const { graph } = build(p)
    assert.equal(graph.getLines().length, 0, 'no line groups before initNodes')
  })

  it('personNodes length matches getPersonNodes().length', () => {
    const parent = new MPerson('Parent /K/')
    const spouse = new MPerson('Spouse /K/')
    const fulcrumPerson = new MPerson('Fulcrum /K/')
    new MFamily([parent], [spouse], [fulcrumPerson])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse)
    run(graph, fulcrum)
    assert.equal(
      graph.animator.personNodes.length,
      graph.getPersonNodes().length,
      'personNodes length matches getPersonNodes()',
    )
  })

  it('nodes list includes FamilyNodes when spouses present', () => {
    const parent = new MPerson('Parent /L/')
    const spouse = new MPerson('Spouse /L/')
    const fulcrumPerson = new MPerson('Fulcrum /L/')
    new MFamily([parent], [spouse], [fulcrumPerson])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse)
    run(graph, fulcrum)
    const hasFamilyNode = graph.animator.nodes.some(n => n.constructor.name === 'FamilyNode')
    assert.ok(hasFamilyNode, 'nodes includes at least one FamilyNode')
  })

  it('getPersonNodes returns all PersonNode instances', () => {
    const p = new MPerson('Only /M/')
    const { graph, fulcrum } = build(p)
    run(graph, fulcrum)
    const nodes = graph.getPersonNodes()
    assert.equal(nodes.length, 1, 'one person node')
    assert.equal(nodes[0].person.getId(), p.getId())
  })

  it('setMaxBitmapSize and getMaxBitmapSize roundtrip', () => {
    const p = new MPerson('Bitmap /N/')
    const { graph } = build(p)
    graph.setMaxBitmapSize(4096)
    assert.equal(graph.getMaxBitmapSize(), 4096)
  })
})
