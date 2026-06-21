import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { Parser } from '../../../../vendor/gedcom-parser/index'
import { Graph } from '../Graph'
import { Person, Family, Gedcom, Name, EventFact, FamilyRef } from '../../model/types'

class MName implements Name {
  constructor(private v: string) {}
  getDisplayValue(): string {
    return this.v
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
  constructor(
    public id: string,
    public names: MName[],
    public facts: MFact[],
    public parentFams: MFamily[],
    public spouseFams: MFamily[],
  ) {}
  getId(): string {
    return this.id
  }
  getNames(): Name[] {
    return this.names
  }
  getEventsFacts(): EventFact[] {
    return this.facts
  }
  getParentFamilies(_g?: Gedcom): Family[] {
    return this.parentFams
  }
  getSpouseFamilies(_g?: Gedcom): Family[] {
    return this.spouseFams
  }
}

class MFamily implements Family {
  id: string
  _children: MPerson[] = []
  constructor(
    public husbRefs: MRef[],
    public wifeRefs: MRef[],
    public children: MPerson[],
    public facts: MFact[],
  ) {
    this.id = `F${Math.random().toString(36).slice(2)}`
    for (const c of children) c.parentFams.push(this)
    for (const r of [...husbRefs, ...wifeRefs]) {
      if (r.person) (r.person as MPerson).spouseFams.push(this)
    }
  }
  getId(): string {
    return this.id
  }
  getHusbandRefs(): FamilyRef[] {
    return this.husbRefs
  }
  getWifeRefs(): FamilyRef[] {
    return this.wifeRefs
  }
  getSpouseRefs(): FamilyRef[] {
    return []
  }
  getParentRefs(): FamilyRef[] {
    return []
  }
  getHusbands(_g?: Gedcom): Person[] {
    return this.husbRefs.filter(r => r.person).map(r => r.person!)
  }
  getWives(_g?: Gedcom): Person[] {
    return this.wifeRefs.filter(r => r.person).map(r => r.person!)
  }
  getChildren(_g?: Gedcom): Person[] {
    return [...this._children]
  }
  getEventsFacts(): EventFact[] {
    return this.facts
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

function mapParsedGedcom(records: any[]): { people: MPerson[]; families: MFamily[] } {
  const people: Map<string, MPerson> = new Map()
  const families: Map<string, MFamily> = new Map()
  for (const node of records) {
    if (node.value === 'INDI') {
      const id = node.name
      const names: MName[] = []
      const facts: MFact[] = []
      for (const child of node.records || []) {
        if (child.name === 'NAME' && child.value) {
          names.push(new MName(child.value))
        } else if (child.name === 'SEX' && child.value) {
          facts.push(new MFact('SEX', child.value))
        } else if (child.name === 'BIRT') {
          const dateNode = (child.records || []).find((c: any) => c.name === 'DATE')
          facts.push(new MFact('BIRT', '', dateNode ? dateNode.value : null))
        } else if (child.name === 'DEAT') {
          const dateNode = (child.records || []).find((c: any) => c.name === 'DATE')
          facts.push(new MFact('DEAT', 'Y', dateNode ? dateNode.value : null))
        } else if (child.name === 'BURI') {
          const dateNode = (child.records || []).find((c: any) => c.name === 'DATE')
          facts.push(new MFact('BURI', '', dateNode ? dateNode.value : null))
        }
      }
      if (names.length === 0) names.push(new MName(id))
      const p = new MPerson(id, names, facts, [], [])
      people.set(p.id, p)
    }
  }
  for (const node of records) {
    if (node.value === 'FAM') {
      const husbRefs: MRef[] = []
      const wifeRefs: MRef[] = []
      const children: MPerson[] = []
      const facts: MFact[] = []
      for (const child of node.records || []) {
        if (child.name === 'HUSB' && child.value) {
          husbRefs.push(new MRef(child.value, people.get(child.value) ?? null))
        } else if (child.name === 'WIFE' && child.value) {
          wifeRefs.push(new MRef(child.value, people.get(child.value) ?? null))
        } else if (child.name === 'CHIL' && child.value) {
          const p = people.get(child.value)
          if (p) children.push(p)
        } else if (child.name === 'MARR') {
          const dateNode = (child.records || []).find((c: any) => c.name === 'DATE')
          facts.push(new MFact('MARR', '', dateNode ? dateNode.value : null))
        }
      }
      const fam = new MFamily(husbRefs, wifeRefs, children, facts)
      families.set(fam.id, fam)
    }
  }
  return { people: [...people.values()], families: [...families.values()] }
}

describe('Shirodkar tree integration', () => {
  it('renders Shirodkar 26-person tree without crashes', () => {
    const gedPath = path.resolve(__dirname, '..', '..', '..', '..', '..', 'render', 'shirodkar.ged')
    if (!fs.existsSync(gedPath)) {
      assert.ok(true, 'shirodkar.ged not found, skipping')
      return
    }
    const raw = fs.readFileSync(gedPath, 'utf-8')
    const records = Parser.parse(raw)
    const { people, families } = mapParsedGedcom(records)
    const gedcom = new MGedcom(people, families)
    const fulcrum = people[0]
    assert.ok(fulcrum, 'fulcrum person found')
    const graph = new Graph()
    graph.setGedcom(gedcom)
    graph.startFrom(fulcrum)
    graph.initNodes()
    graph.placeNodes()
    assert.ok(graph.getWidth() > 0, 'width > 0')
    assert.ok(graph.getHeight() > 0, 'height > 0')
    assert.ok(graph.animator.nodes.length >= 26, `at least 26 nodes: ${graph.animator.nodes.length}`)
    for (const n of graph.animator.nodes) {
      assert.ok(isFinite(n.x) && isFinite(n.y), `node ${n} has finite pos`)
    }
  })
})
