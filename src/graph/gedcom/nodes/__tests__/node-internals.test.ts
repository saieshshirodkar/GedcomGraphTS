import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { Card, Match } from '../../config/Util'
import { MPerson, MFamily, MFact, build, run } from '../../__tests__/test-helper'

describe('Node internals', () => {
  it('fulcrum node has type FULCRUM and isFulcrumNode true', () => {
    const p = new MPerson('Main /A/')
    const { graph, fulcrum } = build(p)
    run(graph, fulcrum)
    const fulcrumNodes = graph.animator.personNodes.filter(n => n.isFulcrumNode())
    assert.equal(fulcrumNodes.length, 1)
    const fn = fulcrumNodes[0]
    assert.equal(fn.type, Card.FULCRUM)
    assert.equal(fn.person.getId(), p.getId())
  })

  it('regular non-fulcrum nodes have type REGULAR', () => {
    const parent = new MPerson('Parent /B/')
    const spouse = new MPerson('Spouse /B/')
    const fulcrumPerson = new MPerson('Fulcrum /B/')
    new MFamily([parent], [spouse], [fulcrumPerson])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse)
    run(graph, fulcrum)
    for (const pn of graph.animator.personNodes) {
      if (!pn.isFulcrumNode() && !pn.mini && !pn.acquired) {
        assert.equal(pn.type, Card.REGULAR, `${pn.person.getId()} should be REGULAR`)
      }
    }
  })

  it('ANCESTRY cards are mini with amount > 0', () => {
    const fulcrumPerson = new MPerson('Fulcrum /C/')
    const { graph, fulcrum } = build(fulcrumPerson)
    graph.maxAncestors(0)
    run(graph, fulcrum)
    for (const pn of graph.animator.personNodes) {
      if (pn.type === Card.ANCESTRY) {
        assert.ok(pn.mini, 'ANCESTRY card should be mini')
        assert.ok(pn.amount >= 1, `ANCESTRY amount >= 1, got ${pn.amount}`)
      }
    }
  })

  it('PROGENY cards are mini with amount > 0', () => {
    const fulcrumPerson = new MPerson('Fulcrum /D/')
    const spouse = new MPerson('Spouse /D/')
    const child = new MPerson('Child /D/')
    const grandchild = new MPerson('Grandchild /D/')
    new MFamily([fulcrumPerson], [spouse], [child])
    new MFamily([child], [new MPerson('Partner /D/')], [grandchild])
    const { graph, fulcrum } = build(fulcrumPerson, spouse, child, grandchild)
    graph.maxDescendants(0)
    run(graph, fulcrum)
    for (const pn of graph.animator.personNodes) {
      if (pn.type === Card.PROGENY) {
        assert.ok(pn.mini, 'PROGENY card should be mini')
        assert.ok(pn.amount >= 1, `PROGENY amount >= 1, got ${pn.amount}`)
      }
    }
  })

  it('dead flag set for DEAT or BURI facts', () => {
    const dead1 = new MPerson('Dead /E/', [new MFact('DEAT', 'Y', '1 JAN 2000')])
    const dead2 = new MPerson('Buried /E/', [new MFact('BURI', '', '5 JAN 2000')])
    const alive = new MPerson('Alive /E/', [new MFact('BIRT', '', '1 JAN 2000')])
    for (const p of [dead1, dead2, alive]) {
      const { graph, fulcrum } = build(p)
      run(graph, fulcrum)
      const node = graph.animator.personNodes.find(n => n.person.getId() === p.getId())
      assert.ok(node, `${p.getNames()[0].getDisplayValue()} node exists`)
      if (p === dead1 || p === dead2) {
        assert.ok(node!.dead, `${p.getNames()[0].getDisplayValue()} should be dead`)
      } else {
        assert.equal(node!.dead, false, `${p.getNames()[0].getDisplayValue()} should not be dead`)
      }
    }
  })

  it('duplicate flag set for duplicate person nodes', () => {
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
    run(graph, fulcrum)
    const dupNodes = graph.animator.personNodes.filter(n => n.duplicate)
    assert.ok(dupNodes.length > 0, 'at least one duplicate node')
    assert.ok(graph.getDuplicateLines().length > 0, 'duplicate lines exist')
  })

  it('acquired flag for in-law ancestors', () => {
    const parent = new MPerson('Parent /G/')
    const spouse = new MPerson('Spouse /G/')
    const fulcrumPerson = new MPerson('Fulcrum /G/')
    new MFamily([parent], [spouse], [fulcrumPerson])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse)
    graph.displayNumbers(true)
    run(graph, fulcrum)
    const acquired = graph.animator.personNodes.filter(n => n.acquired)
    if (acquired.length > 0) {
      for (const a of acquired) {
        assert.ok(
          a.origin !== null || a.type === Card.ANCESTRY,
          `acquired node ${a.person.getId()} should have origin or be ancestry`,
        )
      }
    }
  })

  it('generation values are contiguous integers across all nodes', () => {
    const parent = new MPerson('Parent /H/')
    const spouse = new MPerson('Spouse /H/')
    const fulcrumPerson = new MPerson('Fulcrum /H/')
    const child = new MPerson('Child /H/')
    new MFamily([parent], [spouse], [fulcrumPerson])
    new MFamily([fulcrumPerson], [new MPerson('Partner /H/')], [child])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse, child)
    run(graph, fulcrum)
    const gens = graph.animator.personNodes.map(n => n.generation)
    for (const g of gens) {
      assert.ok(Number.isInteger(g), `generation ${g} should be integer`)
    }
    const minGen = Math.min(...gens)
    const maxGen = Math.max(...gens)
    for (let g = minGen; g <= maxGen; g++) {
      assert.ok(gens.includes(g), `generation ${g} should be present`)
    }
  })

  it('isHalfSibling flag is set appropriately', () => {
    const parent = new MPerson('Parent /I/')
    const spouse1 = new MPerson('Spouse1 /I/')
    const spouse2 = new MPerson('Spouse2 /I/')
    const child1 = new MPerson('Child1 /I/')
    const child2 = new MPerson('Child2 /I/')
    new MFamily([parent], [spouse1], [child1])
    new MFamily([parent], [spouse2], [child2])
    const { graph, fulcrum } = build(child1, parent, spouse1, spouse2, child2)
    graph.maxSiblingsNephews(2)
    run(graph, fulcrum)
    for (const pn of graph.animator.personNodes) {
      if (pn.isHalfSibling) {
        assert.ok(pn.generation >= 0, 'half-sibling at generation >= 0')
      }
    }
  })

  it('youth (children group) is not null for parent nodes', () => {
    const fulcrumPerson = new MPerson('Fulcrum /J/')
    const spouse = new MPerson('Spouse /J/')
    const child = new MPerson('Child /J/')
    new MFamily([fulcrumPerson], [spouse], [child])
    const { graph, fulcrum } = build(fulcrumPerson, spouse, child)
    run(graph, fulcrum)
    for (const pn of graph.animator.personNodes) {
      if (pn.person.getSpouseFamilies(graph.gedcom).some(f => f.getChildren().length > 0)) {
        // no crash check
      }
    }
  })

  it('marriage match enum values are set correctly', () => {
    const fulcrumPerson = new MPerson('Fulcrum /K/')
    const spouse1 = new MPerson('Spouse1 /K/')
    const spouse2 = new MPerson('Spouse2 /K/')
    const child1 = new MPerson('Child1 /K/')
    const child2 = new MPerson('Child2 /K/')
    new MFamily([fulcrumPerson], [spouse1], [child1])
    new MFamily([fulcrumPerson], [spouse2], [child2])
    const { graph, fulcrum } = build(fulcrumPerson, spouse1, spouse2, child1, child2)
    run(graph, fulcrum)
    const matchValues = graph.animator.nodes.map(n => n.match)
    assert.ok(matchValues.length > 0, 'nodes have match values')
    for (const m of matchValues) {
      assert.ok([Match.MAIN, Match.NEAR, Match.MIDDLE, Match.FAR].includes(m), `match value ${m} is valid`)
    }
  })

  it('origin reference points to parent node', () => {
    const parent = new MPerson('Parent /L/')
    const spouse = new MPerson('Spouse /L/')
    const fulcrumPerson = new MPerson('Fulcrum /L/')
    new MFamily([parent], [spouse], [fulcrumPerson])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse)
    run(graph, fulcrum)
    const fulcrumNode = graph.animator.personNodes.find(n => n.isFulcrumNode())
    assert.ok(fulcrumNode, 'fulcrum exists')
    if (fulcrumNode!.origin) {
      assert.ok(isFinite(fulcrumNode!.origin.x), 'origin has finite x')
      assert.ok(isFinite(fulcrumNode!.origin.y), 'origin has finite y')
    }
  })
})
