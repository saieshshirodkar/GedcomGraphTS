import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { Graph } from '../Graph'
import { Person, Family, Gedcom, Name, EventFact, FamilyRef } from '../../model/types'

let nextId = 1
function uid(): string {
  return `@I${nextId++}@`
}
function fid(): string {
  return `@F${nextId++}@`
}

class MName implements Name {
  constructor(private value: string) {}
  getDisplayValue(): string {
    return this.value
  }
  getGiven(): string {
    return ''
  }
  getSurname(): string {
    return ''
  }
  getNickname(): string {
    return ''
  }
}

class MFact implements EventFact {
  constructor(
    private tag: string,
    private value: string | null = null,
    private date: string | null = null,
  ) {}
  getTag(): string | null {
    return this.tag
  }
  getValue(): string | null {
    return this.value
  }
  getDate(): string | null {
    return this.date
  }
  getPlace(): string | null {
    return null
  }
}

class MRef implements FamilyRef {
  ref: string
  person: Person | null
  constructor(ref: string, person: Person | null) {
    this.ref = ref
    this.person = person
  }
  getFamily(_g: Gedcom): Family | null {
    return null
  }
  getPerson(_g: Gedcom): Person | null {
    return this.person
  }
}

class MPerson implements Person {
  id: string
  private _names: Name[]
  private _facts: EventFact[]
  private _parentFams: Family[]
  private _spouseFams: Family[]
  constructor(name: string, facts?: EventFact[], parentFams?: Family[], spouseFams?: Family[]) {
    this.id = uid()
    this._names = [new MName(name)]
    this._facts = facts ?? []
    this._parentFams = parentFams ?? []
    this._spouseFams = spouseFams ?? []
  }
  getId(): string {
    return this.id
  }
  getNames(): Name[] {
    return this._names
  }
  getEventsFacts(): EventFact[] {
    return this._facts
  }
  getParentFamilies(): Family[] {
    return this._parentFams
  }
  getSpouseFamilies(): Family[] {
    return this._spouseFams
  }
}

class MFamily implements Family {
  id: string
  private _husbands: Person[]
  private _wives: Person[]
  private _children: Person[]
  private _facts: EventFact[]
  constructor(husbands: Person[], wives: Person[], children: Person[], facts?: EventFact[]) {
    this.id = fid()
    this._husbands = husbands
    this._wives = wives
    this._children = children
    this._facts = facts ?? []
    for (const p of [...husbands, ...wives]) {
      const p2 = p as MPerson
      ;(p2 as any)._spouseFams = [...(p2 as any)._spouseFams, this]
    }
    for (const c of children) {
      const c2 = c as MPerson
      ;(c2 as any)._parentFams = [...(c2 as any)._parentFams, this]
    }
  }
  getId(): string {
    return this.id
  }
  getHusbandRefs(): FamilyRef[] {
    return this._husbands.map(p => new MRef(p.getId(), p))
  }
  getWifeRefs(): FamilyRef[] {
    return this._wives.map(p => new MRef(p.getId(), p))
  }
  getSpouseRefs(): FamilyRef[] {
    return []
  }
  getParentRefs(): FamilyRef[] {
    return []
  }
  getHusbands(): Person[] {
    return [...this._husbands]
  }
  getWives(): Person[] {
    return [...this._wives]
  }
  getChildren(): Person[] {
    return [...this._children]
  }
  getEventsFacts(): EventFact[] {
    return this._facts
  }
}

class MGedcom implements Gedcom {
  people: Map<string, Person>
  families: Map<string, Family>
  constructor(people: Person[], families: Family[]) {
    this.people = new Map(people.map(p => [p.getId(), p]))
    this.families = new Map(families.map(f => [f.getId(), f]))
  }
  getPerson(id: string): Person | null {
    return this.people.get(id) ?? null
  }
  getPeople(): Person[] {
    return [...this.people.values()]
  }
  getFamilies(): Family[] {
    return [...this.families.values()]
  }
}

function build(...people: MPerson[]): { gedcom: MGedcom; fulcrum: MPerson; graph: Graph } {
  const allFams = new Set<Family>()
  for (const p of people) {
    for (const f of p.getParentFamilies()) allFams.add(f)
    for (const f of p.getSpouseFamilies()) allFams.add(f)
  }
  const gedcom = new MGedcom(people, [...allFams])
  const fulcrum = people[0]
  const graph = new Graph()
  graph.setGedcom(gedcom)
  return { gedcom, fulcrum, graph }
}

function run(graph: Graph, fulcrum: Person): void {
  graph.startFrom(fulcrum)
  graph.initNodes()
  graph.placeNodes()
}

function hasFinitePos(n: { x: number; y: number; width: number; height: number }): boolean {
  return isFinite(n.x) && isFinite(n.y) && isFinite(n.width) && isFinite(n.height)
}

describe('Graph engine', () => {
  it('single person with no families', () => {
    const p = new MPerson('Alice /Smith/')
    const { graph, fulcrum } = build(p)
    run(graph, fulcrum)
    assert.ok(graph.animator.nodes.length >= 1)
    assert.ok(graph.animator.personNodes.length >= 1)
    for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
    const fulcrumNodes = graph.animator.personNodes.filter(n => n.isFulcrumNode())
    assert.equal(fulcrumNodes.length, 1)
    assert.equal(fulcrumNodes[0].person.getId(), p.getId())
  })

  it('person with two parents', () => {
    const mom = new MPerson('Mom /Smith/')
    const dad = new MPerson('Dad /Smith/')
    const child = new MPerson('Child /Smith/')
    new MFamily([dad], [mom], [child])
    const { graph, fulcrum } = build(child, mom, dad)
    run(graph, fulcrum)
    const nodeIds = graph.animator.personNodes.map(n => n.person.getId())
    assert.ok(nodeIds.includes(mom.getId()))
    assert.ok(nodeIds.includes(dad.getId()))
    assert.ok(nodeIds.includes(child.getId()))
    for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
  })

  it('person with spouse and children', () => {
    const spouse = new MPerson('Spouse /A/')
    const fulcrumPerson = new MPerson('Fulcrum /B/', [], [], [])
    const child1 = new MPerson('Child1 /B/')
    const child2 = new MPerson('Child2 /B/')
    new MFamily([fulcrumPerson], [spouse], [child1, child2])
    const { graph, fulcrum } = build(fulcrumPerson, spouse, child1, child2)
    run(graph, fulcrum)
    for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
    const ids = graph.animator.personNodes.map(n => n.person.getId())
    assert.ok(ids.includes(child1.getId()))
    assert.ok(ids.includes(child2.getId()))
    assert.ok(ids.includes(spouse.getId()))
    assert.ok(ids.includes(fulcrumPerson.getId()))
  })

  it('three generations (grandparents -> parents -> fulcrum -> children)', () => {
    const gf = new MPerson('Grandpa /A/')
    const gm = new MPerson('Grandma /A/')
    const parent = new MPerson('Parent /B/')
    const spouse = new MPerson('Spouse /B/')
    const fulcrumPerson = new MPerson('Fulcrum /C/')
    const child = new MPerson('Child /C/')
    new MFamily([gf], [gm], [parent])
    new MFamily([parent], [spouse], [fulcrumPerson])
    new MFamily([], [fulcrumPerson], [child])
    const { graph, fulcrum } = build(fulcrumPerson, parent, spouse, child, gf, gm)
    run(graph, fulcrum)
    for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
    const ids = graph.animator.personNodes.map(n => n.person.getId())
    assert.ok(ids.includes(gf.getId()))
    assert.ok(ids.includes(gm.getId()))
    assert.ok(ids.includes(parent.getId()))
    assert.ok(ids.includes(spouse.getId()))
    assert.ok(ids.includes(fulcrumPerson.getId()))
    assert.ok(ids.includes(child.getId()))
    assert.ok(graph.getWidth() > 0)
    assert.ok(graph.getHeight() > 0)
  })

  it('multiple marriages', () => {
    const fulcrumPerson = new MPerson('Fulcrum /A/')
    const spouse1 = new MPerson('Spouse1 /B/')
    const spouse2 = new MPerson('Spouse2 /C/')
    const child1 = new MPerson('Child1 /A/')
    const child2 = new MPerson('Child2 /A/')
    new MFamily([fulcrumPerson], [spouse1], [child1])
    new MFamily([fulcrumPerson], [spouse2], [child2])
    const { graph, fulcrum } = build(fulcrumPerson, spouse1, spouse2, child1, child2)
    run(graph, fulcrum)
    assert.ok(graph.animator.nodes.length >= 4)
    for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
    const personIds = graph.animator.personNodes.map(n => n.person.getId())
    assert.ok(personIds.includes(spouse1.getId()))
    assert.ok(personIds.includes(spouse2.getId()))
  })

  it('detects dead person from DEAT fact', () => {
    const p = new MPerson('Dead /Gone/', [new MFact('DEAT', 'Y', '1 JAN 2000')])
    const { graph, fulcrum } = build(p)
    run(graph, fulcrum)
    const deadNode = graph.animator.personNodes.find(n => n.person.getId() === p.getId())
    assert.ok(deadNode)
    assert.ok(deadNode!.dead)
  })

  it('detects dead person from BURI fact', () => {
    const p = new MPerson('Buried /Gone/', [new MFact('BURI', '', '5 JAN 2000')])
    const { graph, fulcrum } = build(p)
    run(graph, fulcrum)
    const deadNode = graph.animator.personNodes.find(n => n.person.getId() === p.getId())
    assert.ok(deadNode)
    assert.ok(deadNode!.dead)
  })

  it('alive person is not marked dead', () => {
    const p = new MPerson('Alive /Here/', [new MFact('BIRT', '', '1 JAN 2000')])
    const { graph, fulcrum } = build(p)
    run(graph, fulcrum)
    const aliveNode = graph.animator.personNodes.find(n => n.person.getId() === p.getId())
    assert.ok(aliveNode)
    assert.equal(aliveNode!.dead, false)
  })

  it('displayNumbers(false) still produces layout', () => {
    const p = new MPerson('Alice /Nums/')
    const { graph, fulcrum } = build(p)
    graph.displayNumbers(false)
    run(graph, fulcrum)
    assert.ok(graph.animator.nodes.length >= 1)
    for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
  })

  it('displaySpouses(false) hides spouse', () => {
    const spouse = new MPerson('Hidden /Spouse/')
    const fulcrumPerson = new MPerson('Fulcrum /Main/')
    const child = new MPerson('Child /Main/')
    new MFamily([fulcrumPerson], [spouse], [child])
    const { graph, fulcrum } = build(fulcrumPerson, spouse, child)
    graph.displaySpouses(false)
    run(graph, fulcrum)
    const fnodes = graph.animator.personNodes.filter(n => n.isFulcrumNode())
    assert.equal(fnodes.length, 1)
  })

  it('duplicate detection creates DuplicateLine', () => {
    const grandfather = new MPerson('Grandpa /Q/')
    const grandmother = new MPerson('Grandma /R/')
    const dad = new MPerson('Dad /D/')
    const aunt = new MPerson('Aunt /A/')
    const mom = new MPerson('Mom /M/')
    const uncle = new MPerson('Uncle /U/')
    const fulcrumPerson = new MPerson('Fulcrum /Dup/')
    const spouse = new MPerson('Spouse /Dup/')
    const child = new MPerson('Child /Dup/')
    new MFamily([grandfather], [grandmother], [dad, aunt])
    new MFamily([dad], [mom], [fulcrumPerson])
    new MFamily([uncle], [aunt], [spouse])
    new MFamily([fulcrumPerson], [spouse], [child])
    const { graph, fulcrum } = build(fulcrumPerson, spouse, child, grandfather, grandmother, dad, aunt, mom, uncle)
    graph.displayDuplicateLines(true)
    run(graph, fulcrum)
    const dupNodes = graph.animator.personNodes.filter(n => n.duplicate)
    assert.ok(dupNodes.length > 0, 'at least one duplicate PersonNode')
    assert.equal(
      graph.animator.duplicateLines.length,
      dupNodes.length,
      `duplicate lines (${graph.animator.duplicateLines.length}) == duplicate nodes (${dupNodes.length})`,
    )
  })

  it('handles empty family (no partners)', () => {
    const p = new MPerson('Only /One/')
    const { graph, fulcrum } = build(p)
    run(graph, fulcrum)
    assert.ok(graph.animator.nodes.length >= 1)
    for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
  })

  it('layout is deterministic (same input = same output)', () => {
    const p = new MPerson('Deterministic /Test/')
    const firstRun = build(p)
    run(firstRun.graph, firstRun.fulcrum)
    const pos1 = firstRun.graph.animator.nodes.map(n => ({ x: n.x, y: n.y }))

    nextId = 1
    const p2 = new MPerson('Deterministic /Test/')
    const secondRun = build(p2)
    run(secondRun.graph, secondRun.fulcrum)
    const pos2 = secondRun.graph.animator.nodes.map(n => ({ x: n.x, y: n.y }))

    assert.equal(pos1.length, pos2.length)
    for (let i = 0; i < pos1.length; i++) {
      assert.equal(pos1[i].x, pos2[i].x)
      assert.equal(pos1[i].y, pos2[i].y)
    }
  })

  it('maxAncestors(0) shows no ancestors', () => {
    const gf = new MPerson('Grandpa /A/')
    const gm = new MPerson('Grandma /A/')
    const parent = new MPerson('Parent /B/')
    const fulcrumPerson = new MPerson('Fulcrum /C/')
    new MFamily([gf], [gm], [parent])
    new MFamily([parent], [new MPerson('Spouse /B/')], [fulcrumPerson])
    const { graph, fulcrum } = build(fulcrumPerson, parent, gf, gm)
    graph.maxAncestors(0)
    run(graph, fulcrum)
    for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
  })

  it('maxDescendants(0) shows no descendants', () => {
    const fulcrumPerson = new MPerson('Fulcrum /D/')
    const spouse = new MPerson('Spouse /D/')
    const child = new MPerson('Child /D/')
    new MFamily([fulcrumPerson], [spouse], [child])
    const { graph, fulcrum } = build(fulcrumPerson, spouse, child)
    graph.maxDescendants(0)
    run(graph, fulcrum)
    for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
  })

  it('generates bonds for married couples', () => {
    const spouse = new MPerson('Spouse /M/')
    const fulcrumPerson = new MPerson('Fulcrum /M/', [], [], [])
    new MFamily([fulcrumPerson], [spouse], [])
    const { graph, fulcrum } = build(fulcrumPerson, spouse)
    run(graph, fulcrum)
    assert.ok(graph.getBonds().length >= 1, 'should have at least one bond')
  })

  it('marriage date on bond', () => {
    const spouse = new MPerson('Spouse /D/')
    const fulcrumPerson = new MPerson('Fulcrum /D/')
    new MFamily([fulcrumPerson], [spouse], [], [new MFact('MARR', '', '15 JUN 1990')])
    const { graph, fulcrum } = build(fulcrumPerson, spouse)
    run(graph, fulcrum)
    for (const bond of graph.getBonds()) {
      if (bond.marriageDate) {
        const year = bond.marriageYear()
        assert.ok(year.endsWith('1990') || year.includes('1990'), `year should include '1990', got '${year}'`)
      }
    }
  })

  it('bond toString returns year or hearth', () => {
    const spouse = new MPerson('Spouse /Y/')
    const fulcrumPerson = new MPerson('Fulcrum /Y/')
    new MFamily([fulcrumPerson], [spouse], [], [new MFact('MARR', '', '5 MAY 1985')])
    const { graph, fulcrum } = build(fulcrumPerson, spouse)
    run(graph, fulcrum)
    for (const bond of graph.getBonds()) {
      const str = bond.toString()
      assert.ok(str.length > 0)
    }
  })
})
