import { Person, Family, Gedcom, Name, EventFact, FamilyRef } from '../model/types'

let nextId = 1
export function resetIds(): void {
  nextId = 1
}
export function uid(): string {
  return `@I${nextId++}@`
}
export function fid(): string {
  return `@F${nextId++}@`
}

export class MName implements Name {
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

export class MFact implements EventFact {
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

export class MRef implements FamilyRef {
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

export class MPerson implements Person {
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
  getParentFamilies(_g?: Gedcom): Family[] {
    return this._parentFams
  }
  getSpouseFamilies(_g?: Gedcom): Family[] {
    return this._spouseFams
  }
}

export class MFamily implements Family {
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
  getHusbands(_gedcom?: Gedcom): Person[] {
    return [...this._husbands]
  }
  getWives(_gedcom?: Gedcom): Person[] {
    return [...this._wives]
  }
  getChildren(_gedcom?: Gedcom): Person[] {
    return [...this._children]
  }
  getEventsFacts(): EventFact[] {
    return this._facts
  }
}

export class MGedcom implements Gedcom {
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

import { Graph } from '../engine/Graph'

export function build(...people: MPerson[]): { gedcom: MGedcom; fulcrum: MPerson; graph: Graph } {
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

export function run(graph: Graph, fulcrum: Person): void {
  graph.startFrom(fulcrum)
  graph.initNodes()
  graph.placeNodes()
}

export function hasFinitePos(n: { x: number; y: number; width: number; height: number }): boolean {
  return isFinite(n.x) && isFinite(n.y) && isFinite(n.width) && isFinite(n.height)
}
