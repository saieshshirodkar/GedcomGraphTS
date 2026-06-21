import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { Parser } from '../../../../vendor/gedcom-parser/index'
import { Graph } from '../Graph'
import { Person, Family, Gedcom, Name, EventFact, FamilyRef } from '../../model/types'
import { Card } from '../../config/Util'

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
        if (child.name === 'NAME' && child.value) names.push(new MName(child.value))
        else if (child.name === 'SEX' && child.value) facts.push(new MFact('SEX', child.value))
        else if (child.name === 'BIRT') {
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
        if (child.name === 'HUSB' && child.value) husbRefs.push(new MRef(child.value, people.get(child.value) ?? null))
        else if (child.name === 'WIFE' && child.value)
          wifeRefs.push(new MRef(child.value, people.get(child.value) ?? null))
        else if (child.name === 'CHIL' && child.value) {
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

function hasFinitePos(n: { x: number; y: number; width: number; height: number }): boolean {
  return isFinite(n.x) && isFinite(n.y) && isFinite(n.width) && isFinite(n.height)
}

describe('Real GEDCOM trees', () => {
  describe('Shirodkar tree (26 people)', () => {
    const gedPath = path.resolve(__dirname, '..', '..', '..', '..', '..', 'render', 'shirodkar.ged')

    it('renders shirodkar with fulcrum=I1 (Shankar)', () => {
      if (!fs.existsSync(gedPath)) {
        assert.ok(true, 'skipped')
        return
      }
      const raw = fs.readFileSync(gedPath, 'utf-8')
      const records = Parser.parse(raw)
      const { people, families } = mapParsedGedcom(records)
      const gedcom = new MGedcom(people, families)
      const fulcrum = gedcom.getPerson('@I1@')
      assert.ok(fulcrum, 'fulcrum I1 found')
      const graph = new Graph()
      graph.setGedcom(gedcom).maxAncestors(3).maxDescendants(3)
      graph.startFrom(fulcrum)
      graph.initNodes()
      graph.placeNodes()
      for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
      assert.ok(graph.animator.nodes.length >= 10, 'at least 10 nodes')
    })

    it('renders shirodkar with fulcrum=I113 (Rowlu)', () => {
      if (!fs.existsSync(gedPath)) {
        assert.ok(true, 'skipped')
        return
      }
      const raw = fs.readFileSync(gedPath, 'utf-8')
      const records = Parser.parse(raw)
      const { people, families } = mapParsedGedcom(records)
      const gedcom = new MGedcom(people, families)
      const fulcrum = gedcom.getPerson('@I113@')
      assert.ok(fulcrum, 'fulcrum I113 found')
      const graph = new Graph()
      graph.setGedcom(gedcom).maxAncestors(3).maxDescendants(3)
      graph.startFrom(fulcrum)
      graph.initNodes()
      graph.placeNodes()
      for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
    })

    it('renders shirodkar with displayNumbers(false)', () => {
      if (!fs.existsSync(gedPath)) {
        assert.ok(true, 'skipped')
        return
      }
      const raw = fs.readFileSync(gedPath, 'utf-8')
      const records = Parser.parse(raw)
      const { people, families } = mapParsedGedcom(records)
      const gedcom = new MGedcom(people, families)
      const fulcrum = gedcom.getPerson('@I1@')
      assert.ok(fulcrum, 'fulcrum I1 found')
      const graph = new Graph()
      graph.setGedcom(gedcom).displayNumbers(false)
      graph.startFrom(fulcrum)
      graph.initNodes()
      graph.placeNodes()
      for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
    })

    it('shirodkar: ancestry/progeny cards created with max 0', () => {
      if (!fs.existsSync(gedPath)) {
        assert.ok(true, 'skipped')
        return
      }
      const raw = fs.readFileSync(gedPath, 'utf-8')
      const records = Parser.parse(raw)
      const { people, families } = mapParsedGedcom(records)
      const gedcom = new MGedcom(people, families)
      const fulcrum = gedcom.getPerson('@I1@')
      assert.ok(fulcrum, 'fulcrum I1 found')
      const graph = new Graph()
      graph.setGedcom(gedcom).maxAncestors(0).maxDescendants(0).displayNumbers(true)
      graph.startFrom(fulcrum)
      graph.initNodes()
      graph.placeNodes()
      const types = graph.animator.personNodes.map(n => n.type)
      const hasAncestry = types.some(t => t === Card.ANCESTRY)
      const hasProgeny = types.some(t => t === Card.PROGENY)
      assert.ok(hasAncestry || hasProgeny, 'has ancestry or progeny cards')
    })

    it('shirodkar with displayDuplicateLines(false) does not crash', () => {
      if (!fs.existsSync(gedPath)) {
        assert.ok(true, 'skipped')
        return
      }
      const raw = fs.readFileSync(gedPath, 'utf-8')
      const records = Parser.parse(raw)
      const { people, families } = mapParsedGedcom(records)
      const gedcom = new MGedcom(people, families)
      const fulcrum = gedcom.getPerson('@I1@')
      assert.ok(fulcrum, 'fulcrum I1 found')
      const graph = new Graph()
      graph.setGedcom(gedcom).displayDuplicateLines(false)
      graph.startFrom(fulcrum)
      graph.initNodes()
      graph.placeNodes()
      assert.equal(graph.getDuplicateLines().length, 0)
    })

    it('shirodkar with maxAncestors(0) maxDescendants(0) still produces width', () => {
      if (!fs.existsSync(gedPath)) {
        assert.ok(true, 'skipped')
        return
      }
      const raw = fs.readFileSync(gedPath, 'utf-8')
      const records = Parser.parse(raw)
      const { people, families } = mapParsedGedcom(records)
      const gedcom = new MGedcom(people, families)
      const fulcrum = gedcom.getPerson('@I1@')
      assert.ok(fulcrum, 'fulcrum I1 found')
      const graph = new Graph()
      graph.setGedcom(gedcom).maxAncestors(0).maxDescendants(0)
      graph.startFrom(fulcrum)
      graph.initNodes()
      graph.placeNodes()
      assert.ok(graph.getWidth() > 0, 'width > 0 with zero depth')
    })

    it('shirodkar with layout left-to-right', () => {
      if (!fs.existsSync(gedPath)) {
        assert.ok(true, 'skipped')
        return
      }
      const raw = fs.readFileSync(gedPath, 'utf-8')
      const records = Parser.parse(raw)
      const { people, families } = mapParsedGedcom(records)
      const gedcom = new MGedcom(people, families)
      const fulcrum = gedcom.getPerson('@I1@')
      assert.ok(fulcrum, 'fulcrum I1 found')
      const graph = new Graph()
      graph.setGedcom(gedcom).setLayoutDirection(true)
      graph.startFrom(fulcrum)
      graph.initNodes()
      graph.placeNodes()
      assert.ok(graph.getWidth() > 0, 'width > 0')
      assert.ok(graph.animator.leftToRight, 'leftToRight flag')
    })

    it('shirodkar setMaxBitmapSize produces biggestPathSize', () => {
      if (!fs.existsSync(gedPath)) {
        assert.ok(true, 'skipped')
        return
      }
      const raw = fs.readFileSync(gedPath, 'utf-8')
      const records = Parser.parse(raw)
      const { people, families } = mapParsedGedcom(records)
      const gedcom = new MGedcom(people, families)
      const fulcrum = gedcom.getPerson('@I1@')
      assert.ok(fulcrum, 'fulcrum I1 found')
      const graph = new Graph()
      graph.setGedcom(gedcom).setMaxBitmapSize(2000)
      graph.startFrom(fulcrum)
      graph.initNodes()
      graph.placeNodes()
      assert.ok(graph.getBiggestPathSize() > 0, 'biggestPathSize > 0')
    })
  })

  describe('Harry Potter tree (114 people)', () => {
    const hpPath = path.resolve(__dirname, '..', '..', '..', '..', '..', 'render', 'harry_potter.ged')

    it('renders Harry Potter tree with fulcrum=Harry', () => {
      if (!fs.existsSync(hpPath)) {
        assert.ok(true, 'skipped')
        return
      }
      const raw = fs.readFileSync(hpPath, 'utf-8')
      const records = Parser.parse(raw)
      const { people, families } = mapParsedGedcom(records)
      const gedcom = new MGedcom(people, families)
      const fulcrum = gedcom.getPerson('@I1@')
      assert.ok(fulcrum, 'Harry found')
      const graph = new Graph()
      graph.setGedcom(gedcom).maxAncestors(3).maxDescendants(3)
      graph.startFrom(fulcrum)
      graph.initNodes()
      graph.placeNodes()
      for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
      assert.ok(graph.animator.nodes.length > 50, 'at least 50 nodes')
    })

    it('HP tree with maxAncestors(2) maxDescendants(2) works', () => {
      if (!fs.existsSync(hpPath)) {
        assert.ok(true, 'skipped')
        return
      }
      const raw = fs.readFileSync(hpPath, 'utf-8')
      const records = Parser.parse(raw)
      const { people, families } = mapParsedGedcom(records)
      const gedcom = new MGedcom(people, families)
      const fulcrum = gedcom.getPerson('@I1@')
      assert.ok(fulcrum, 'Harry found')
      const graph = new Graph()
      graph.setGedcom(gedcom).maxAncestors(2).maxDescendants(2)
      graph.startFrom(fulcrum)
      graph.initNodes()
      graph.placeNodes()
      for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
    })

    it('HP tree with all mini cards (max 0 ancestors/descendants)', () => {
      if (!fs.existsSync(hpPath)) {
        assert.ok(true, 'skipped')
        return
      }
      const raw = fs.readFileSync(hpPath, 'utf-8')
      const records = Parser.parse(raw)
      const { people, families } = mapParsedGedcom(records)
      const gedcom = new MGedcom(people, families)
      const fulcrum = gedcom.getPerson('@I1@')
      assert.ok(fulcrum, 'Harry found')
      const graph = new Graph()
      graph.setGedcom(gedcom).maxAncestors(0).maxDescendants(0).displayNumbers(true)
      graph.startFrom(fulcrum)
      graph.initNodes()
      graph.placeNodes()
      for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
    })

    it('HP tree with displaySpouses(false)', () => {
      if (!fs.existsSync(hpPath)) {
        assert.ok(true, 'skipped')
        return
      }
      const raw = fs.readFileSync(hpPath, 'utf-8')
      const records = Parser.parse(raw)
      const { people, families } = mapParsedGedcom(records)
      const gedcom = new MGedcom(people, families)
      const fulcrum = gedcom.getPerson('@I1@')
      assert.ok(fulcrum, 'Harry found')
      const graph = new Graph()
      graph.setGedcom(gedcom).displaySpouses(false)
      graph.startFrom(fulcrum)
      graph.initNodes()
      graph.placeNodes()
      for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
    })

    it('HP tree with maxSiblingsNephews(0)', () => {
      if (!fs.existsSync(hpPath)) {
        assert.ok(true, 'skipped')
        return
      }
      const raw = fs.readFileSync(hpPath, 'utf-8')
      const records = Parser.parse(raw)
      const { people, families } = mapParsedGedcom(records)
      const gedcom = new MGedcom(people, families)
      const fulcrum = gedcom.getPerson('@I1@')
      assert.ok(fulcrum, 'Harry found')
      const graph = new Graph()
      graph.setGedcom(gedcom).maxSiblingsNephews(0)
      graph.startFrom(fulcrum)
      graph.initNodes()
      graph.placeNodes()
      for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
    })

    it('HP tree with setLayoutDirection(true)', () => {
      if (!fs.existsSync(hpPath)) {
        assert.ok(true, 'skipped')
        return
      }
      const raw = fs.readFileSync(hpPath, 'utf-8')
      const records = Parser.parse(raw)
      const { people, families } = mapParsedGedcom(records)
      const gedcom = new MGedcom(people, families)
      const fulcrum = gedcom.getPerson('@I1@')
      assert.ok(fulcrum, 'Harry found')
      const graph = new Graph()
      graph.setGedcom(gedcom).setLayoutDirection(true)
      graph.startFrom(fulcrum)
      graph.initNodes()
      graph.placeNodes()
      assert.ok(graph.getWidth() > 0)
    })

    it('HP tree with maxGreatUncles(0)', () => {
      if (!fs.existsSync(hpPath)) {
        assert.ok(true, 'skipped')
        return
      }
      const raw = fs.readFileSync(hpPath, 'utf-8')
      const records = Parser.parse(raw)
      const { people, families } = mapParsedGedcom(records)
      const gedcom = new MGedcom(people, families)
      const fulcrum = gedcom.getPerson('@I1@')
      assert.ok(fulcrum, 'Harry found')
      const graph = new Graph()
      graph.setGedcom(gedcom).maxGreatUncles(0)
      graph.startFrom(fulcrum)
      graph.initNodes()
      graph.placeNodes()
      for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
    })

    it('HP tree with maxUnclesCousins(0)', () => {
      if (!fs.existsSync(hpPath)) {
        assert.ok(true, 'skipped')
        return
      }
      const raw = fs.readFileSync(hpPath, 'utf-8')
      const records = Parser.parse(raw)
      const { people, families } = mapParsedGedcom(records)
      const gedcom = new MGedcom(people, families)
      const fulcrum = gedcom.getPerson('@I1@')
      assert.ok(fulcrum, 'Harry found')
      const graph = new Graph()
      graph.setGedcom(gedcom).maxUnclesCousins(0)
      graph.startFrom(fulcrum)
      graph.initNodes()
      graph.placeNodes()
      for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
    })

    it('HP tree with setMaxBitmapSize produces biggestPathSize', () => {
      if (!fs.existsSync(hpPath)) {
        assert.ok(true, 'skipped')
        return
      }
      const raw = fs.readFileSync(hpPath, 'utf-8')
      const records = Parser.parse(raw)
      const { people, families } = mapParsedGedcom(records)
      const gedcom = new MGedcom(people, families)
      const fulcrum = gedcom.getPerson('@I1@')
      assert.ok(fulcrum, 'Harry found')
      const graph = new Graph()
      graph.setGedcom(gedcom).setMaxBitmapSize(2000)
      graph.startFrom(fulcrum)
      graph.initNodes()
      graph.placeNodes()
      assert.ok(graph.getBiggestPathSize() > 0, 'biggestPathSize > 0')
    })
  })

  describe('Edge cases', () => {
    it('single person with no relatives has finite positions', () => {
      const raw = '0 HEAD\n0 @I1@ INDI\n1 NAME Solo /Person/\n0 TRLR\n'
      const records = Parser.parse(raw)
      const { people, families } = mapParsedGedcom(records)
      const gedcom = new MGedcom(people, families)
      const fulcrum = gedcom.getPerson('@I1@')
      assert.ok(fulcrum, 'fulcrum found')
      const graph = new Graph()
      graph.setGedcom(gedcom)
      graph.startFrom(fulcrum)
      graph.initNodes()
      graph.placeNodes()
      for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
    })

    it('two-person family (parent+child) renders', () => {
      let raw = '0 HEAD\n0 @I1@ INDI\n1 NAME Parent /\n1 FAMS @F1@\n'
      raw += '0 @I2@ INDI\n1 NAME Child /\n1 FAMC @F1@\n'
      raw += '0 @F1@ FAM\n1 HUSB @I1@\n1 CHIL @I2@\n0 TRLR\n'
      const records = Parser.parse(raw)
      const { people, families } = mapParsedGedcom(records)
      const gedcom = new MGedcom(people, families)
      const fulcrum = gedcom.getPerson('@I2@')
      assert.ok(fulcrum, 'child found')
      const graph = new Graph()
      graph.setGedcom(gedcom)
      graph.startFrom(fulcrum)
      graph.initNodes()
      graph.placeNodes()
      for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
    })

    it('multi-marriage without children renders', () => {
      let raw = '0 HEAD\n0 @I1@ INDI\n1 NAME Person /\n1 SEX M\n'
      raw += '1 FAMS @F1@\n1 FAMS @F2@\n'
      raw += '0 @I2@ INDI\n1 NAME Spouse1 /\n1 SEX F\n1 FAMS @F1@\n'
      raw += '0 @I3@ INDI\n1 NAME Spouse2 /\n1 SEX F\n1 FAMS @F2@\n'
      raw += '0 @F1@ FAM\n1 HUSB @I1@\n1 WIFE @I2@\n'
      raw += '0 @F2@ FAM\n1 HUSB @I1@\n1 WIFE @I3@\n0 TRLR\n'
      const records = Parser.parse(raw)
      const { people, families } = mapParsedGedcom(records)
      const gedcom = new MGedcom(people, families)
      const fulcrum = gedcom.getPerson('@I1@')
      assert.ok(fulcrum, 'person found')
      const graph = new Graph()
      graph.setGedcom(gedcom)
      graph.startFrom(fulcrum)
      graph.initNodes()
      graph.placeNodes()
      for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
    })

    it('family with same birth and death dates', () => {
      let raw = '0 HEAD\n0 @I1@ INDI\n1 NAME Still /Born/\n'
      raw += '1 BIRT\n2 DATE 1 JAN 2000\n1 DEAT\n2 DATE 1 JAN 2000\n0 TRLR\n'
      const records = Parser.parse(raw)
      const { people, families } = mapParsedGedcom(records)
      const gedcom = new MGedcom(people, families)
      const fulcrum = gedcom.getPerson('@I1@')
      assert.ok(fulcrum, 'fulcrum found')
      const graph = new Graph()
      graph.setGedcom(gedcom)
      graph.startFrom(fulcrum)
      graph.initNodes()
      graph.placeNodes()
      for (const n of graph.animator.nodes) assert.ok(hasFinitePos(n))
    })
  })
})
