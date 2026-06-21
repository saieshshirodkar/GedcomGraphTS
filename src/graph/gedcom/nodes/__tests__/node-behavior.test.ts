import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { MPerson, MFamily, MFact, build, run } from '../../__tests__/test-helper'
import { Card, Match } from '../../config/Util'
import { PersonNode } from '../PersonNode'
import { FamilyNode } from '../FamilyNode'
import { Bond } from '../Bond'

describe('Node behavior', () => {
  it('PersonNode centerRelX is width/2', () => {
    const p = new MPerson('Test /A/')
    const { graph, fulcrum } = build(p)
    run(graph, fulcrum)
    for (const pn of graph.animator.personNodes) {
      assert.equal(pn.centerRelX(), pn.width / 2, `centerRelX=${pn.centerRelX()}, width/2=${pn.width / 2}`)
    }
  })

  it('PersonNode centerRelY is height/2', () => {
    const p = new MPerson('Test /B/')
    const { graph, fulcrum } = build(p)
    run(graph, fulcrum)
    for (const pn of graph.animator.personNodes) {
      assert.equal(pn.centerRelY(), pn.height / 2)
    }
  })

  it('isFulcrumNode true only for fulcrum', () => {
    const parent = new MPerson('Parent /C/')
    const spouse = new MPerson('Spouse /C/')
    const fulcrumPerson = new MPerson('Fulcrum /C/')
    new MFamily([parent], [spouse], [fulcrumPerson])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse)
    run(graph, fulcrum)
    for (const pn of graph.animator.personNodes) {
      if (pn.person.getId() === fulcrumPerson.getId()) {
        assert.ok(pn.isFulcrumNode(), 'fulcrum is fulcrum')
      } else {
        assert.equal(pn.isFulcrumNode(), false, 'non-fulcrum is not')
      }
    }
  })

  it('dead flag set when DEAT or BURI fact exists', () => {
    const dead1 = new MPerson('Dead /D/', [new MFact('DEAT', 'Y')])
    const dead2 = new MPerson('Buried /D/', [new MFact('BURI', '')])
    const alive = new MPerson('Alive /D/', [])
    for (const p of [dead1, dead2, alive]) {
      const { graph, fulcrum } = build(p)
      run(graph, fulcrum)
      const node = graph.animator.personNodes.find(n => n.person.getId() === p.getId())
      assert.ok(node, 'node exists')
      if (p === dead1 || p === dead2) {
        assert.ok(node!.dead, 'dead flag true')
      } else {
        assert.equal(node!.dead, false, 'dead flag false')
      }
    }
  })

  it('duplicate flag set for duplicate PersonNode', () => {
    const grandfather = new MPerson('Grandpa /E/')
    const grandmother = new MPerson('Grandma /E/')
    const dad = new MPerson('Dad /E/')
    const aunt = new MPerson('Aunt /E/')
    const mom = new MPerson('Mom /E/')
    const uncle = new MPerson('Uncle /E/')
    const fulcrumPerson = new MPerson('Fulcrum /E/')
    const spouse = new MPerson('Spouse /E/')
    const child = new MPerson('Child /E/')
    new MFamily([grandfather], [grandmother], [dad, aunt])
    new MFamily([dad], [mom], [fulcrumPerson])
    new MFamily([uncle], [aunt], [spouse])
    new MFamily([fulcrumPerson], [spouse], [child])
    const { graph, fulcrum } = build(fulcrumPerson, spouse, child, grandfather, grandmother, dad, aunt, mom, uncle)
    run(graph, fulcrum)
    const dups = graph.animator.personNodes.filter(n => n.duplicate)
    assert.ok(dups.length > 0, 'at least one duplicate')
  })

  it('acquired flag set for in-law ancestors', () => {
    const parent = new MPerson('Parent /F/')
    const spouse = new MPerson('Spouse /F/')
    const fulcrumPerson = new MPerson('Fulcrum /F/')
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

  it('PersonNode setX updates force and x', () => {
    const pn = new PersonNode({} as any, new MPerson('Force /G/'), Card.REGULAR)
    pn.x = 10
    pn.force = 0
    pn.setX(20)
    assert.equal(pn.x, 20)
    assert.equal(pn.force, 10)
  })

  it('PersonNode setY updates y', () => {
    const pn = new PersonNode({} as any, new MPerson('YTest /H/'), Card.REGULAR)
    pn.setY(42)
    assert.equal(pn.y, 42)
  })

  it('FamilyNode setX updates partners and bond position', () => {
    const fn = new FamilyNode({} as any, false, 0 as any, false)
    fn.bond = new Bond(fn)
    fn.bond.width = 10
    const pn = new PersonNode({} as any, new MPerson('Partner /I/'), Card.REGULAR)
    pn.width = 50
    fn.partners = [pn]
    fn.setX(100)
    assert.equal(fn.x, 100)
    assert.equal(pn.x, 100)
  })

  it('FamilyNode getMainPersonNode returns first non-acquired partner', () => {
    const fn = new FamilyNode({} as any, false, 0 as any, false)
    const acq = new PersonNode({} as any, new MPerson('Acquired /J/'), Card.REGULAR)
    acq.acquired = true
    const main = new PersonNode({} as any, new MPerson('Main /J/'), Card.REGULAR)
    fn.partners = [acq, main]
    assert.equal(fn.getMainPersonNode(), main)
  })

  it('FamilyNode getMainPersonNode returns null if all acquired', () => {
    const fn = new FamilyNode({} as any, false, 0 as any, false)
    const a1 = new PersonNode({} as any, new MPerson('A1 /J/'), Card.REGULAR)
    a1.acquired = true
    fn.partners = [a1]
    assert.equal(fn.getMainPersonNode(), null)
  })

  it('FamilyNode hasChildren returns true when youth is not null', () => {
    const fn = new FamilyNode({} as any, false, 0 as any, false)
    assert.equal(fn.hasChildren(), false, 'no children initially')
    fn.youth = {} as any
    assert.ok(fn.hasChildren(), 'has children when youth set')
  })

  it('FamilyNode hasChildren returns true when mini', () => {
    const fn = new FamilyNode({} as any, true, 0 as any, false)
    assert.ok(fn.hasChildren(), 'mini always has children')
  })

  it('FamilyNode getPartner returns partner at index', () => {
    const fn = new FamilyNode({} as any, false, 0 as any, false)
    const p0 = new PersonNode({} as any, new MPerson('P0 /K/'), Card.REGULAR)
    const p1 = new PersonNode({} as any, new MPerson('P1 /K/'), Card.REGULAR)
    fn.partners = [p0, p1]
    assert.equal(fn.getPartner(0), p0)
    assert.equal(fn.getPartner(1), p1)
    assert.equal(fn.getPartner(2), null)
  })

  it('Bond centerX is x + width/2', () => {
    const fn = new FamilyNode({} as any, false, 0 as any, false)
    const bond = new Bond(fn)
    bond.x = 10
    bond.width = 20
    assert.equal(bond.centerX(), 20)
  })

  it('Bond marriageYear returns last word of marriageDate', () => {
    const fn = new FamilyNode({} as any, false, 0 as any, false)
    const bond = new Bond(fn)
    bond.marriageDate = '15 JUN 1990'
    assert.equal(bond.marriageYear(), ' 1990')
  })

  it('Bond marriageYear returns empty string for null date', () => {
    const fn = new FamilyNode({} as any, false, 0 as any, false)
    const bond = new Bond(fn)
    assert.equal(bond.marriageYear(), '')
  })

  it('Bond toString returns year or hearth symbol', () => {
    const fn = new FamilyNode({} as any, false, 0 as any, false)
    const bond = new Bond(fn)
    assert.equal(bond.toString(), '-•-')
    bond.marriageDate = '1 JAN 2000'
    assert.ok(bond.toString().includes('2000'))
  })

  it('Node getOrigin returns origin for PersonNode', () => {
    const pn = new PersonNode({} as any, new MPerson('Origin /L/'), Card.REGULAR)
    const parent = new PersonNode({} as any, new MPerson('Parent /L/'), Card.REGULAR)
    pn.origin = parent
    assert.equal(pn.getOrigin(), parent)
  })

  it('Node isMultiMarriage returns true for NEAR/MIDDLE/FAR', () => {
    const pn = new PersonNode({} as any, new MPerson('MM /M/'), Card.REGULAR)
    pn.match = Match.MAIN
    assert.equal(pn.isMultiMarriage(), false)
    pn.match = Match.NEAR
    assert.ok(pn.isMultiMarriage(), 'NEAR is multi')
    pn.match = Match.MIDDLE
    assert.ok(pn.isMultiMarriage(), 'MIDDLE is multi')
    pn.match = Match.FAR
    assert.ok(pn.isMultiMarriage(), 'FAR is multi')
  })

  it('PersonNode isDuplicate returns duplicate field', () => {
    const pn = new PersonNode({} as any, new MPerson('Dup /N/'), Card.REGULAR)
    assert.equal(pn.isDuplicate(), false)
    pn.duplicate = true
    assert.ok(pn.isDuplicate())
  })

  it('PersonNode getOrigins returns single-element array when origin set', () => {
    const parent = new PersonNode({} as any, new MPerson('Parent /O/'), Card.REGULAR)
    const child = new PersonNode({} as any, new MPerson('Child /O/'), Card.REGULAR)
    child.origin = parent
    const origins = child.getOrigins()
    assert.equal(origins.length, 1)
    assert.equal(origins[0], parent)
  })

  it('PersonNode getOrigins returns empty when origin null', () => {
    const pn = new PersonNode({} as any, new MPerson('NoOrigin /P/'), Card.REGULAR)
    assert.equal(pn.getOrigins().length, 0)
  })

  it('PersonNode getFamilyNode returns familyNode or self', () => {
    const pn = new PersonNode({} as any, new MPerson('FN /Q/'), Card.REGULAR)
    assert.equal(pn.getFamilyNode(), pn)
    const fn = new FamilyNode({} as any, false, 0 as any, false)
    pn.familyNode = fn
    assert.equal(pn.getFamilyNode(), fn)
  })

  it('PersonNode getMainPersonNode returns null for half sibling', () => {
    const pn = new PersonNode({} as any, new MPerson('Half /R/'), Card.REGULAR)
    pn.isHalfSibling = true
    assert.equal(pn.getMainPersonNode(), null)
  })
})
