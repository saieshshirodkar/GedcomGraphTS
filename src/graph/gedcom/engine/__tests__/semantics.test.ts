import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { MPerson, MFamily, MFact, build, run, hasFinitePos } from '../../__tests__/test-helper'

describe('Semantic edge cases', () => {
  it('single parent family (mother only, no father)', () => {
    const mom = new MPerson('Mom /A/')
    const fulcrumPerson = new MPerson('Fulcrum /A/')
    new MFamily([], [mom], [fulcrumPerson])
    const { graph, fulcrum } = build(fulcrumPerson, mom)
    run(graph, fulcrum)
    for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
    const momNode = graph.animator.personNodes.find(n => n.person.getId() === mom.getId())
    assert.ok(momNode, 'mother appears')
  })

  it('single parent family (father only, no mother)', () => {
    const dad = new MPerson('Dad /B/')
    const fulcrumPerson = new MPerson('Fulcrum /B/')
    new MFamily([dad], [], [fulcrumPerson])
    const { graph, fulcrum } = build(fulcrumPerson, dad)
    run(graph, fulcrum)
    for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
    const dadNode = graph.animator.personNodes.find(n => n.person.getId() === dad.getId())
    assert.ok(dadNode, 'father appears')
  })

  it('half-siblings share one parent', () => {
    const parent = new MPerson('Parent /C/')
    const spouse1 = new MPerson('Spouse1 /C/')
    const spouse2 = new MPerson('Spouse2 /C/')
    const child1 = new MPerson('Child1 /C/')
    const child2 = new MPerson('Child2 /C/')
    new MFamily([parent], [spouse1], [child1])
    new MFamily([parent], [spouse2], [child2])
    const { graph, fulcrum } = build(child1, parent, spouse1, spouse2, child2)
    graph.maxSiblingsNephews(2)
    run(graph, fulcrum)
    for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
    const ids = graph.animator.personNodes.map(n => n.person.getId())
    assert.ok(ids.includes(child2.getId()), 'half-sibling child2 appears')
  })

  it('step-family via new spouse (no children together)', () => {
    const parent = new MPerson('Parent /D/')
    const spouse1 = new MPerson('Spouse1 /D/')
    const spouse2 = new MPerson('Spouse2 /D/')
    const child1 = new MPerson('Child1 /D/')
    new MFamily([parent], [spouse1], [child1])
    new MFamily([parent], [spouse2], []) // step-marriage
    const { graph, fulcrum } = build(child1, parent, spouse1, spouse2)
    graph.maxSiblingsNephews(1)
    run(graph, fulcrum)
    for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
    const ids = graph.animator.personNodes.map(n => n.person.getId())
    assert.ok(ids.includes(spouse2.getId()), 'step-spouse appears')
  })

  it('person with multiple spouse families', () => {
    const fulcrumPerson = new MPerson('Fulcrum /E/')
    const spouse1 = new MPerson('First /E/')
    const spouse2 = new MPerson('Second /E/')
    const child1 = new MPerson('Child1 /E/')
    const child2 = new MPerson('Child2 /E/')
    new MFamily([fulcrumPerson], [spouse1], [child1])
    new MFamily([fulcrumPerson], [spouse2], [child2])
    const { graph, fulcrum } = build(fulcrumPerson, spouse1, spouse2, child1, child2)
    run(graph, fulcrum)
    for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
    const ids = graph.animator.personNodes.map(n => n.person.getId())
    assert.ok(ids.includes(spouse1.getId()), 'spouse1 appears')
    assert.ok(ids.includes(spouse2.getId()), 'spouse2 appears')
    assert.ok(ids.includes(child1.getId()), 'child1 appears')
    assert.ok(ids.includes(child2.getId()), 'child2 appears')
  })

  it('person with no name shows [No name]', () => {
    const p = new MPerson('')
    const { graph, fulcrum } = build(p)
    run(graph, fulcrum)
    const fn = graph.animator.personNodes.find(n => n.isFulcrumNode())
    assert.ok(fn, 'fulcrum node exists')
    assert.ok(fn!.toString().includes('No name'), 'toString contains No name')
  })

  it('missing SEX tag defaults to Gender.NONE', () => {
    const p = new MPerson('NoSex /F/', [])
    const { graph, fulcrum } = build(p)
    run(graph, fulcrum)
    assert.ok(true, 'no crash with missing sex')
  })

  it('person with birth and death same date', () => {
    const p = new MPerson('Stillborn /G/', [new MFact('BIRT', '', '1 JAN 2000'), new MFact('DEAT', 'Y', '1 JAN 2000')])
    const { graph, fulcrum } = build(p)
    run(graph, fulcrum)
    for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
    const node = graph.animator.personNodes.find(n => n.person.getId() === p.getId())
    assert.ok(node, 'stillborn node exists')
    assert.ok(node!.dead, 'stillborn is dead')
  })

  it('family with only children (no parents)', () => {
    const fulcrumPerson = new MPerson('Fulcrum /H/')
    const spouse = new MPerson('Spouse /H/')
    const child = new MPerson('Child /H/')
    new MFamily([], [], [fulcrumPerson]) // family with no husband/wife, just child
    new MFamily([fulcrumPerson], [spouse], [child])
    const { graph, fulcrum } = build(fulcrumPerson, spouse, child)
    run(graph, fulcrum)
    for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
  })

  it('partners with missing family link', () => {
    const fulcrumPerson = new MPerson('Fulcrum /I/')
    const { graph, fulcrum } = build(fulcrumPerson)
    run(graph, fulcrum)
    for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
  })

  it('generation continuity across multi-marriage', () => {
    const mother = new MPerson('Mother /J/')
    const father1 = new MPerson('Father1 /J/')
    const father2 = new MPerson('Father2 /J/')
    const child1 = new MPerson('Child1 /J/')
    const child2 = new MPerson('Child2 /J/')
    new MFamily([father1], [mother], [child1])
    new MFamily([father2], [mother], [child2])
    const { graph, fulcrum } = build(child1, mother, father1, father2, child2)
    run(graph, fulcrum)
    for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
  })

  it('cousin marriage (blood-related spouses) still renders', () => {
    const grandfather = new MPerson('Grandfather /K/')
    const grandmother = new MPerson('Grandmother /K/')
    const dad = new MPerson('Dad /K/')
    const aunt = new MPerson('Aunt /K/')
    const mom = new MPerson('Mom /K/')
    const uncle = new MPerson('Uncle /K/')
    const fulcrumPerson = new MPerson('Fulcrum /K/')
    const spouse = new MPerson('Spouse /K/')
    new MFamily([grandfather], [grandmother], [dad, aunt])
    new MFamily([dad], [mom], [fulcrumPerson])
    new MFamily([uncle], [aunt], [spouse])
    new MFamily([fulcrumPerson], [spouse], [])
    const { graph, fulcrum } = build(fulcrumPerson, spouse, dad, mom, aunt, uncle, grandfather, grandmother)
    run(graph, fulcrum)
    for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
  })

  it('empty GEDCOM person list renders single fulcrum', () => {
    const p = new MPerson('Solo /L/')
    const { graph, fulcrum } = build(p)
    run(graph, fulcrum)
    assert.equal(graph.animator.personNodes.length, 1)
    assert.ok(graph.animator.personNodes[0].isFulcrumNode())
  })
})
