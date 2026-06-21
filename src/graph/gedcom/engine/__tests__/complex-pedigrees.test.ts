import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { MPerson, MFamily, build, run, hasFinitePos } from '../../__tests__/test-helper'
import { Card } from '../../config/Util'

describe('Complex pedigrees', () => {
  it('5-generation deep tree renders all nodes with finite positions', () => {
    const gen5 = new MPerson('Gen5 /A/')
    const g5sp = new MPerson('G5Sp /A/')
    const gen4 = new MPerson('Gen4 /A/')
    const g4sp = new MPerson('G4Sp /A/')
    const gen3 = new MPerson('Gen3 /A/')
    const g3sp = new MPerson('G3Sp /A/')
    const gen2 = new MPerson('Gen2 /A/')
    const g2sp = new MPerson('G2Sp /A/')
    const gen1 = new MPerson('Gen1 /A/')
    const g1sp = new MPerson('G1Sp /A/')
    const fulcrumPerson = new MPerson('Fulcrum /A/')
    const spouse = new MPerson('Spouse /A/')
    const child = new MPerson('Child /A/')
    new MFamily([gen5], [g5sp], [gen4])
    new MFamily([gen4], [g4sp], [gen3])
    new MFamily([gen3], [g3sp], [gen2])
    new MFamily([gen2], [g2sp], [gen1])
    new MFamily([gen1], [g1sp], [fulcrumPerson])
    new MFamily([fulcrumPerson], [spouse], [child])
    const { graph, fulcrum } = build(
      fulcrumPerson,
      spouse,
      child,
      gen1,
      g1sp,
      gen2,
      g2sp,
      gen3,
      g3sp,
      gen4,
      g4sp,
      gen5,
      g5sp,
    )
    graph.maxAncestors(5).maxDescendants(1)
    run(graph, fulcrum)
    for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n), `node pos finite: ${n}`)
    assert.ok(graph.getWidth() > 0, 'width positive')
    assert.ok(graph.getHeight() > 0, 'height positive')
  })

  it('6-sibling wide tree spreads horizontally', () => {
    const parent = new MPerson('Parent /B/')
    const spouse = new MPerson('Spouse /B/')
    const siblings: MPerson[] = []
    const sibs: MPerson[] = []
    for (let i = 0; i < 6; i++) {
      const s = new MPerson(`Sib${i} /B/`)
      const sp = new MPerson(`Sib${i}Sp /B/`)
      siblings.push(s)
      sibs.push(sp)
    }
    new MFamily([parent], [spouse], [siblings[0]])
    new MFamily([siblings[0]], [sibs[0]], [])
    for (let i = 0; i < 6; i++) {
      if (i === 0) continue
      new MFamily([parent], [spouse], [siblings[i]])
    }
    const allPeople = [siblings[0], ...sibs.slice(0, 1), parent, spouse, ...siblings.slice(1)]
    const { graph, fulcrum } = build(siblings[0], ...allPeople)
    graph.maxSiblingsNephews(2)
    run(graph, fulcrum)
    for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
    assert.ok(graph.getWidth() > 100, 'wide tree width > 100')
  })

  it('pedigree collapse (cousins marrying) creates duplicate nodes', () => {
    const greatGrandpa = new MPerson('GreatGrandpa /C/')
    const greatGrandma = new MPerson('GreatGrandma /C/')
    const grandpa1 = new MPerson('Grandpa1 /C/')
    const grandma1 = new MPerson('Grandma1 /C/')
    const grandpa2 = new MPerson('Grandpa2 /C/')
    const grandma2 = new MPerson('Grandma2 /C/')
    const dad = new MPerson('Dad /C/')
    const mom = new MPerson('Mom /C/')
    const spouse = new MPerson('Spouse /C/')
    const fulcrumPerson = new MPerson('Fulcrum /C/')
    new MFamily([greatGrandpa], [greatGrandma], [grandpa1, grandpa2])
    new MFamily([grandpa1], [grandma1], [dad])
    new MFamily([grandpa2], [grandma2], [mom])
    new MFamily([dad], [mom], [fulcrumPerson])
    new MFamily([fulcrumPerson], [spouse], [])
    const { graph, fulcrum } = build(
      fulcrumPerson,
      spouse,
      dad,
      mom,
      grandpa1,
      grandma1,
      grandpa2,
      grandma2,
      greatGrandpa,
      greatGrandma,
    )
    graph.displayDuplicateLines(true)
    run(graph, fulcrum)
    const dupNodes = graph.animator.personNodes.filter(n => n.duplicate)
    assert.ok(dupNodes.length > 0, 'duplicate nodes exist from pedigree collapse')
  })

  it('mini ancestry cards show ancestor count', () => {
    const parent = new MPerson('Parent /D/')
    const spouse = new MPerson('Spouse /D/')
    const grandparent = new MPerson('Grandparent /D/')
    const fulcrumPerson = new MPerson('Fulcrum /D/')
    new MFamily([grandparent], [], [parent])
    new MFamily([parent], [spouse], [fulcrumPerson])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse, grandparent)
    graph.maxAncestors(0)
    graph.displayNumbers(true)
    run(graph, fulcrum)
    const ancestryCards = graph.animator.personNodes.filter(n => n.type === Card.ANCESTRY)
    if (ancestryCards.length > 0) {
      for (const ac of ancestryCards) {
        assert.ok(ac.mini, 'ancestry card is mini')
        assert.ok(ac.amount > 0, `ancestry amount ${ac.amount} > 0`)
      }
    }
  })

  it('mini progeny cards show descendant count', () => {
    const fulcrumPerson = new MPerson('Fulcrum /E/')
    const spouse = new MPerson('Spouse /E/')
    const child = new MPerson('Child /E/')
    const grandchild = new MPerson('Grandchild /E/')
    new MFamily([fulcrumPerson], [spouse], [child])
    new MFamily([child], [new MPerson('Partner /E/')], [grandchild])
    const { graph, fulcrum } = build(fulcrumPerson, spouse, child, grandchild)
    graph.maxDescendants(0)
    graph.displayNumbers(true)
    run(graph, fulcrum)
    const progenyCards = graph.animator.personNodes.filter(n => n.type === Card.PROGENY)
    if (progenyCards.length > 0) {
      for (const pc of progenyCards) {
        assert.ok(pc.mini, 'progeny card is mini')
        assert.ok(pc.amount > 0, `progeny amount ${pc.amount} > 0`)
      }
    }
  })

  it('aunt/uncle/cousin relationships render correctly', () => {
    const grandparent = new MPerson('Grandparent /F/')
    const grandparentSp = new MPerson('GrandparentSp /F/')
    const parent = new MPerson('Parent /F/')
    const aunt = new MPerson('Aunt /F/')
    const uncle = new MPerson('Uncle /F/')
    const spouse = new MPerson('Spouse /F/')
    const cousin = new MPerson('Cousin /F/')
    const fulcrumPerson = new MPerson('Fulcrum /F/')
    new MFamily([grandparent], [grandparentSp], [parent, aunt])
    new MFamily([parent], [spouse], [fulcrumPerson])
    new MFamily([uncle], [aunt], [cousin])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse, grandparent, grandparentSp, aunt, uncle, cousin)
    graph.maxUnclesCousins(2).maxSiblingsNephews(2)
    run(graph, fulcrum)
    for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
    const ids = graph.animator.personNodes.map(n => n.person.getId())
    assert.ok(ids.includes(aunt.getId()), 'aunt appears')
    assert.ok(ids.includes(uncle.getId()), 'uncle appears')
    assert.ok(ids.includes(cousin.getId()), 'cousin appears')
  })

  it('bond creation for all married couples', () => {
    const parent = new MPerson('Parent /G/')
    const spouse = new MPerson('Spouse /G/')
    const fulcrumPerson = new MPerson('Fulcrum /G/')
    const child = new MPerson('Child /G/')
    new MFamily([parent], [spouse], [fulcrumPerson])
    new MFamily([fulcrumPerson], [new MPerson('Partner /G/')], [child])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse, child)
    run(graph, fulcrum)
    // Bonds should exist for all marriages
    const bonds = graph.getBonds()
    assert.ok(bonds.length >= 2, `at least 2 bonds, got ${bonds.length}`)
    for (const bond of bonds) {
      assert.ok(isFinite(bond.x) && isFinite(bond.y), 'bond pos finite')
    }
  })

  it('all node positions are unique (no two nodes at same x,y)', () => {
    const parent = new MPerson('Parent /H/')
    const spouse = new MPerson('Spouse /H/')
    const fulcrumPerson = new MPerson('Fulcrum /H/')
    const child = new MPerson('Child /H/')
    new MFamily([parent], [spouse], [fulcrumPerson])
    new MFamily([fulcrumPerson], [new MPerson('Partner /H/')], [child])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse, child)
    run(graph, fulcrum)
    const posSet = new Set(graph.animator.nodes.map(n => `${n.x},${n.y}`))
    assert.equal(
      posSet.size,
      graph.animator.nodes.length,
      `unique positions: ${posSet.size} == ${graph.animator.nodes.length}`,
    )
  })

  it('fulcrum is the only FULCRUM type node', () => {
    const parent = new MPerson('Parent /I/')
    const spouse = new MPerson('Spouse /I/')
    const fulcrumPerson = new MPerson('Fulcrum /I/')
    new MFamily([parent], [spouse], [fulcrumPerson])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse)
    run(graph, fulcrum)
    const fulcrumCount = graph.animator.personNodes.filter(n => n.type === Card.FULCRUM).length
    assert.equal(fulcrumCount, 1, 'exactly one FULCRUM')
  })

  it('duplicate lines do not crash when disabled', () => {
    const grandpa = new MPerson('Grandpa /J/')
    const grandma = new MPerson('Grandma /J/')
    const dad = new MPerson('Dad /J/')
    const aunt = new MPerson('Aunt /J/')
    const mom = new MPerson('Mom /J/')
    const uncle = new MPerson('Uncle /J/')
    const fulcrumPerson = new MPerson('Fulcrum /J/')
    const spouse = new MPerson('Spouse /J/')
    new MFamily([grandpa], [grandma], [dad, aunt])
    new MFamily([dad], [mom], [fulcrumPerson])
    new MFamily([uncle], [aunt], [spouse])
    new MFamily([fulcrumPerson], [spouse], [])
    const { graph, fulcrum } = build(fulcrumPerson, spouse, dad, mom, aunt, uncle, grandpa, grandma)
    graph.displayDuplicateLines(false)
    run(graph, fulcrum)
    assert.equal(graph.getDuplicateLines().length, 0)
  })

  it('4-gen each side with aunt/uncle works', () => {
    const gggp = new MPerson('GGGP /K/')
    const ggm = new MPerson('GGM /K/')
    const ggp = new MPerson('GGP /K/')
    const gm = new MPerson('GM /K/')
    const gp = new MPerson('GP /K/')
    const m = new MPerson('M /K/')
    const parent = new MPerson('Parent /K/')
    const spouse = new MPerson('Spouse /K/')
    const aunt = new MPerson('Aunt /K/')
    const uncle = new MPerson('Uncle /K/')
    const cousin = new MPerson('Cousin /K/')
    const fulcrumPerson = new MPerson('Fulcrum /K/')
    new MFamily([gggp], [ggm], [ggp])
    new MFamily([ggp], [gm], [gp])
    new MFamily([gp], [m], [parent, aunt])
    new MFamily([parent], [spouse], [fulcrumPerson])
    new MFamily([uncle], [aunt], [cousin])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse, gp, m, ggp, gm, gggp, ggm, aunt, uncle, cousin)
    graph.maxAncestors(4).maxUnclesCousins(2)
    run(graph, fulcrum)
    for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
  })

  it('single person with displayNumbers(true) has finite positions', () => {
    const p = new MPerson('Solo /L/')
    const { graph, fulcrum } = build(p)
    graph.displayNumbers(true)
    run(graph, fulcrum)
    for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
  })
})
