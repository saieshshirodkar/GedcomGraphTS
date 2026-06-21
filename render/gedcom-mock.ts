import { Person, Family, Gedcom, Name, EventFact, FamilyRef } from '../src/graph/gedcom/model/types'

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
    private _tag: string,
    private _val: string | null = null,
    private _date: string | null = null,
  ) {}
  getTag(): string | null {
    return this._tag
  }
  getValue(): string | null {
    return this._val
  }
  getDate(): string | null {
    return this._date
  }
  getPlace(): string | null {
    return null
  }
}

class MRef implements FamilyRef {
  ref: string
  private _person: () => Person | null
  constructor(ref: string, resolve: () => Person | null) {
    this.ref = ref
    this._person = resolve
  }
  getFamily(_g: Gedcom): Family | null {
    return null
  }
  getPerson(_g: Gedcom): Person | null {
    return this._person()
  }
}

class MPerson implements Person {
  id: string
  private _names: Name[] = []
  private _facts: EventFact[] = []
  private _pf: Family[] = []
  private _sf: Family[] = []
  constructor(id: string) {
    this.id = id
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
    return this._pf
  }
  getSpouseFamilies(_g?: Gedcom): Family[] {
    return this._sf
  }
}

class MFamily implements Family {
  id: string
  private _hr: FamilyRef[] = []
  private _wr: FamilyRef[] = []
  private _children: Person[] = []
  private _facts: EventFact[] = []
  constructor(id: string) {
    this.id = id
  }
  getId(): string {
    return this.id
  }
  getHusbandRefs(): FamilyRef[] {
    return this._hr
  }
  getWifeRefs(): FamilyRef[] {
    return this._wr
  }
  getSpouseRefs(): FamilyRef[] {
    return []
  }
  getParentRefs(): FamilyRef[] {
    return []
  }
  getHusbands(gedcom?: Gedcom): Person[] {
    return this._hr.map(r => r.getPerson(gedcom!)).filter((p): p is Person => p !== null)
  }
  getWives(gedcom?: Gedcom): Person[] {
    return this._wr.map(r => r.getPerson(gedcom!)).filter((p): p is Person => p !== null)
  }
  getChildren(_gedcom?: Gedcom): Person[] {
    return this._children
  }
  getEventsFacts(): EventFact[] {
    return this._facts
  }
}

export function mapParsedGedcom(records: any[]): { people: Map<string, MPerson>; families: Map<string, MFamily> } {
  const people = new Map<string, MPerson>()
  const families = new Map<string, MFamily>()

  for (const node of records) {
    if (node.value === 'INDI') {
      const xid = node.name.replace(/^@|@$/g, '')
      people.set(xid, new MPerson(xid))
    } else if (node.value === 'FAM') {
      const xid = node.name.replace(/^@|@$/g, '')
      families.set(xid, new MFamily(xid))
    }
  }

  for (const node of records) {
    if (node.value === 'INDI') {
      const xid = node.name.replace(/^@|@$/g, '')
      const p = people.get(xid)!
      for (const child of node.records) {
        if (child.name === 'NAME') {
          p.getNames().push(new MName(child.value))
        } else if (child.name === 'SEX') {
          p.getEventsFacts().push(new MFact('SEX', child.value))
        } else if (child.name === 'BIRT' || child.name === 'DEAT' || child.name === 'BURI') {
          const dateNode = child.records.find((c: any) => c.name === 'DATE')
          p.getEventsFacts().push(new MFact(child.name, null, dateNode?.value ?? null))
        } else if (child.name === 'FAMS') {
          const famId = child.value.replace(/^@|@$/g, '')
          const f = families.get(famId)
          if (f) p.getSpouseFamilies().push(f)
        } else if (child.name === 'FAMC') {
          const famId = child.value.replace(/^@|@$/g, '')
          const f = families.get(famId)
          if (f) p.getParentFamilies().push(f)
        }
      }
    } else if (node.value === 'FAM') {
      const xid = node.name.replace(/^@|@$/g, '')
      const f = families.get(xid)!
      for (const child of node.records) {
        if (child.name === 'HUSB') {
          const pid = child.value.replace(/^@|@$/g, '')
          f.getHusbandRefs().push(new MRef(pid, () => people.get(pid) ?? null))
        } else if (child.name === 'WIFE') {
          const pid = child.value.replace(/^@|@$/g, '')
          f.getWifeRefs().push(new MRef(pid, () => people.get(pid) ?? null))
        } else if (child.name === 'CHIL') {
          const pid = child.value.replace(/^@|@$/g, '')
          const p = people.get(pid)
          if (p) f.getChildren().push(p)
        } else if (child.name === 'MARR') {
          const dateNode = child.records.find((c: any) => c.name === 'DATE')
          f.getEventsFacts().push(new MFact('MARR', null, dateNode?.value ?? null))
        }
      }
    }
  }
  return { people, families }
}

export function buildGedcom(people: Map<string, MPerson>, families: Map<string, MFamily>): Gedcom {
  const allFams = [...families.values()]
  const allPeople = [...people.values()]
  return {
    getPerson: (id: string) => people.get(id) ?? null,
    getPeople: () => allPeople,
    getFamilies: () => allFams,
  }
}
