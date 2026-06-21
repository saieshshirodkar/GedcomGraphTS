export interface Name {
  getDisplayValue(): string
  getGiven(): string
  getSurname(): string
  getNickname(): string
}

export interface EventFact {
  getTag(): string | null
  getValue(): string | null
  getDate(): string | null
  getPlace(): string | null
}

export interface FamilyRef {
  ref: string
  getFamily(gedcom: Gedcom): Family | null
  getPerson(gedcom: Gedcom): Person | null
}

export interface Family {
  getId(): string
  getHusbandRefs(): FamilyRef[]
  getWifeRefs(): FamilyRef[]
  getSpouseRefs(): FamilyRef[]
  getParentRefs(): FamilyRef[]
  getHusbands(gedcom: Gedcom): Person[]
  getWives(gedcom: Gedcom): Person[]
  getChildren(gedcom?: Gedcom): Person[]
  getEventsFacts(): EventFact[]
}

export interface Person {
  getId(): string
  getNames(): Name[]
  getEventsFacts(): EventFact[]
  getParentFamilies(gedcom: Gedcom): Family[]
  getSpouseFamilies(gedcom: Gedcom): Family[]
}

export interface Gedcom {
  getPerson(id: string): Person | null
  getPeople(): Person[]
  getFamilies(): Family[]
}
