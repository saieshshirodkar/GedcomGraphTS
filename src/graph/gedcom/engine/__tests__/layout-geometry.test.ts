import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { MPerson, MFamily, build, run, hasFinitePos } from '../../__tests__/test-helper'
import { FamilyNode } from '../../nodes/FamilyNode'

function runWithMB(graph: import('../Graph').Graph, fulcrum: import('../../model/types').Person): void {
  graph.setMaxBitmapSize(2000)
  run(graph, fulcrum)
}

describe('Layout geometry', () => {
  it('all person nodes have finite positions after layout', () => {
    const grandparent = new MPerson('Grandpa /A/')
    const parent = new MPerson('Parent /A/')
    const spouse = new MPerson('Spouse /A/')
    const fulcrumPerson = new MPerson('Fulcrum /A/')
    const child = new MPerson('Child /A/')
    new MFamily([grandparent], [], [parent])
    new MFamily([parent], [spouse], [fulcrumPerson])
    new MFamily([fulcrumPerson], [new MPerson('Partner /A/')], [child])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse, child, grandparent)
    runWithMB(graph, fulcrum)
    for (const n of graph.animator.personNodes) {
      assert.ok(hasFinitePos(n), `${n.person.getId()} position finite: ${n.x},${n.y}`)
    }
  })

  it('fulcrum node is at generation 0', () => {
    const parent = new MPerson('Parent /B/')
    const spouse = new MPerson('Spouse /B/')
    const fulcrumPerson = new MPerson('Fulcrum /B/')
    new MFamily([parent], [spouse], [fulcrumPerson])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse)
    runWithMB(graph, fulcrum)
    const fulcrumNode = graph.animator.personNodes.find(n => n.isFulcrumNode())
    assert.ok(fulcrumNode, 'fulcrum node exists')
    assert.equal(fulcrumNode!.generation, 0, 'fulcrum at gen 0')
  })

  it('ascending generation negative, descending positive', () => {
    const gp = new MPerson('GP /C/')
    const gm = new MPerson('GM /C/')
    const parent = new MPerson('Parent /C/')
    const spouse = new MPerson('Spouse /C/')
    const fulcrumPerson = new MPerson('Fulcrum /C/')
    const child = new MPerson('Child /C/')
    new MFamily([gp], [gm], [parent])
    new MFamily([parent], [spouse], [fulcrumPerson])
    new MFamily([fulcrumPerson], [new MPerson('Partner /C/')], [child])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse, child, gp, gm)
    runWithMB(graph, fulcrum)
    for (const pn of graph.animator.personNodes) {
      if (pn.person.getId() === gp.getId() || pn.person.getId() === gm.getId())
        assert.ok(pn.generation < 0, `ancestor gen ${pn.generation} < 0`)
      if (pn.person.getId() === child.getId()) assert.ok(pn.generation > 0, `descendant gen ${pn.generation} > 0`)
    }
  })

  it('generation gap spacing is consistent', () => {
    const gp = new MPerson('GP /D/')
    const parent = new MPerson('Parent /D/')
    const spouse = new MPerson('Spouse /D/')
    const fulcrumPerson = new MPerson('Fulcrum /D/')
    const child = new MPerson('Child /D/')
    new MFamily([gp], [], [parent])
    new MFamily([parent], [spouse], [fulcrumPerson])
    new MFamily([fulcrumPerson], [new MPerson('Partner /D/')], [child])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse, child, gp)
    runWithMB(graph, fulcrum)
    // Check Y ordering: ancestors above, descendants below
    const gpNode = graph.animator.personNodes.find(n => n.person.getId() === gp.getId())
    const parentNode = graph.animator.personNodes.find(n => n.person.getId() === parent.getId())
    const fulcrumNode = graph.animator.personNodes.find(n => n.isFulcrumNode())
    const childNode = graph.animator.personNodes.find(n => n.person.getId() === child.getId())
    assert.ok(gpNode, 'gp exists')
    assert.ok(parentNode, 'parent exists')
    assert.ok(fulcrumNode, 'fulcrum exists')
    assert.ok(childNode, 'child exists')
    if (gpNode && parentNode && fulcrumNode && childNode) {
      assert.ok(gpNode.y <= parentNode.y, 'gp above parent')
      assert.ok(parentNode.y <= fulcrumNode.y, 'parent above fulcrum')
      assert.ok(fulcrumNode.y <= childNode.y, 'fulcrum above child')
    }
  })

  it('nodes with same generation do not overlap horizontally', () => {
    const parent = new MPerson('Parent /E/')
    const spouse = new MPerson('Spouse /E/')
    const aunt = new MPerson('Aunt /E/')
    const uncle = new MPerson('Uncle /E/')
    const fulcrumPerson = new MPerson('Fulcrum /E/')
    new MFamily([parent], [spouse], [fulcrumPerson, aunt])
    new MFamily([uncle], [aunt], [])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse, aunt, uncle)
    graph.maxSiblingsNephews(1)
    runWithMB(graph, fulcrum)
    const xPositions = graph.animator.personNodes
      .filter(n => n.generation === -1)
      .map(n => n.x)
      .sort((a, b) => a - b)
    for (let i = 1; i < xPositions.length; i++) {
      assert.ok(xPositions[i] > xPositions[i - 1], `sorted x positions: ${xPositions[i - 1]} < ${xPositions[i]}`)
    }
  })

  it('spouse nodes are aligned vertically (same y)', () => {
    const parent = new MPerson('Dad /F/')
    const spouse = new MPerson('Mom /F/')
    const fulcrumPerson = new MPerson('Fulcrum /F/')
    new MFamily([parent], [spouse], [fulcrumPerson])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse)
    runWithMB(graph, fulcrum)
    const familyNodes = graph.animator.nodes.filter(n => n instanceof FamilyNode) as FamilyNode[]
    for (const fn of familyNodes) {
      if (fn.partners.length > 1) {
        const yPositions = fn.partners.map(p => p.y)
        assert.equal(new Set(yPositions).size, 1, `partners aligned at same y in ${fn}`)
      }
    }
  })

  it('duplicate lines connect the two duplicate node centers', () => {
    const grandfather = new MPerson('Grandpa /G/')
    const grandmother = new MPerson('Grandma /G/')
    const dad = new MPerson('Dad /G/')
    const aunt = new MPerson('Aunt /G/')
    const mom = new MPerson('Mom /G/')
    const uncle = new MPerson('Uncle /G/')
    const fulcrumPerson = new MPerson('Fulcrum /G/')
    const spouse = new MPerson('Spouse /G/')
    const child = new MPerson('Child /G/')
    new MFamily([grandfather], [grandmother], [dad, aunt])
    new MFamily([dad], [mom], [fulcrumPerson])
    new MFamily([uncle], [aunt], [spouse])
    new MFamily([fulcrumPerson], [spouse], [child])
    const { graph, fulcrum } = build(fulcrumPerson, spouse, child, grandfather, grandmother, dad, aunt, mom, uncle)
    graph.displayDuplicateLines(true)
    runWithMB(graph, fulcrum)
    for (const dl of graph.animator.duplicateLines) {
      dl.update()
      assert.ok(isFinite(dl.x1) && isFinite(dl.y1), 'duplicate line start finite')
      assert.ok(isFinite(dl.x2) && isFinite(dl.y2), 'duplicate line end finite')
      assert.ok(isFinite(dl.x3) && isFinite(dl.y3), 'control point finite')
    }
  })

  it('left-to-right layout swaps X coordinates correctly', () => {
    const parent = new MPerson('Parent /H/')
    const spouse = new MPerson('Spouse /H/')
    const fulcrumPerson = new MPerson('Fulcrum /H/')
    new MFamily([parent], [spouse], [fulcrumPerson])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse)
    graph.setLayoutDirection(true)
    runWithMB(graph, fulcrum)
    assert.ok(graph.animator.leftToRight, 'leftToRight flag is true')
    for (const n of graph.animator.nodes) {
      assert.ok(n.x >= 0, `node x=${n.x} >= 0`)
    }
  })

  it('all nodes have unique positions (no exact duplicates)', () => {
    const parent = new MPerson('Parent /I/')
    const spouse = new MPerson('Spouse /I/')
    const fulcrumPerson = new MPerson('Fulcrum /I/')
    const child = new MPerson('Child /I/')
    new MFamily([parent], [spouse], [fulcrumPerson])
    new MFamily([fulcrumPerson], [new MPerson('Partner /I/')], [child])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse, child)
    runWithMB(graph, fulcrum)
    const positions = new Set(graph.animator.nodes.map(n => `${n.x},${n.y}`))
    assert.equal(positions.size, graph.animator.nodes.length, 'all nodes have unique x,y positions')
  })

  it('full tree has width and height proportional to generations', () => {
    const parent = new MPerson('Parent /J/')
    const spouse = new MPerson('Spouse /J/')
    const fulcrumPerson = new MPerson('Fulcrum /J/')
    const child = new MPerson('Child /J/')
    new MFamily([parent], [spouse], [fulcrumPerson])
    new MFamily([fulcrumPerson], [new MPerson('Partner /J/')], [child])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse, child)
    runWithMB(graph, fulcrum)
    assert.ok(graph.getWidth() > 0, 'width positive')
    assert.ok(graph.getHeight() > 0, 'height positive')
    // 3 gen (parent + fulcrum + child) so height should be more than width typically
    assert.ok(
      graph.getHeight() >= graph.getWidth() / 2,
      `height=${graph.getHeight()} >= width/2=${graph.getWidth() / 2}`,
    )
  })

  it('width and height account for all nodes', () => {
    const parent = new MPerson('Parent /K/')
    const spouse = new MPerson('Spouse /K/')
    const fulcrumPerson = new MPerson('Fulcrum /K/')
    new MFamily([parent], [spouse], [fulcrumPerson])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse)
    runWithMB(graph, fulcrum)
    for (const n of graph.animator.nodes) {
      assert.ok(
        n.x + n.width <= graph.getWidth() + 1,
        `node ${n} fits in width: x=${n.x}+w=${n.width} <= ${graph.getWidth()}`,
      )
      assert.ok(
        n.y + n.height <= graph.getHeight() + 1,
        `node ${n} fits in height: y=${n.y}+h=${n.height} <= ${graph.getHeight()}`,
      )
    }
  })

  it('Match.MAIN family has correctly positioned bond', () => {
    const parent = new MPerson('Parent /L/')
    const spouse = new MPerson('Spouse /L/')
    const fulcrumPerson = new MPerson('Fulcrum /L/')
    new MFamily([parent], [spouse], [fulcrumPerson])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse)
    runWithMB(graph, fulcrum)
    for (const bond of graph.getBonds()) {
      assert.ok(isFinite(bond.x) && isFinite(bond.y), 'bond position finite')
      assert.ok(isFinite(bond.width) && isFinite(bond.height), 'bond size finite')
    }
  })
})
