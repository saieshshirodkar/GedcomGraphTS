import type { Gedcom, Person } from '../model/types'
import { Node } from '../core/Node'
import type { FamilyNode } from './FamilyNode'
import { Branch, Card, essence } from '../config/Util'

export class PersonNode extends Node {
  private gedcom: Gedcom
  person: Person
  origin: Node | null = null
  familyNode: FamilyNode | null = null
  type: Card
  acquired = false
  dead = false
  amount = 0
  duplicate = false
  isHalfSibling = false

  constructor(gedcom: Gedcom, person: Person, type: Card) {
    super()
    this.gedcom = gedcom
    this.person = person
    this.type = type
    if (type === Card.FULCRUM || type === Card.REGULAR) {
      if (this.isDead()) this.dead = true
    } else if (type === Card.ANCESTRY) {
      this.amount = 1
      this.countAncestors(person)
      this.mini = true
    } else if (type === Card.PROGENY) {
      this.amount = 1
      this.countDescendants(person)
      this.mini = true
    }
  }

  getOrigin(): Node | null {
    return this.origin
  }

  getOrigins(): Node[] {
    return this.origin ? [this.origin] : []
  }

  isDuplicate(): boolean {
    return this.duplicate
  }

  getFamilyNode(): Node {
    return this.familyNode ?? this
  }

  getPersonNodes(): PersonNode[] {
    return [this]
  }

  getMainPersonNode(): PersonNode | null {
    return this.isHalfSibling ? null : this
  }

  getHusband(): PersonNode | null {
    return this.familyNode ? this.familyNode.getHusband() : this
  }

  getWife(): PersonNode | null {
    return this.familyNode ? this.familyNode.getWife() : this
  }

  getPartner(id: number): PersonNode | null {
    if (this.familyNode) return this.familyNode.getPartner(id)
    else if (id === 0) return this
    return null
  }

  private countAncestors(ancestor: Person): void {
    if (this.amount <= 100) {
      for (const family of ancestor.getParentFamilies(this.gedcom)) {
        for (const father of family.getHusbands(this.gedcom)) {
          this.amount++
          this.countAncestors(father)
        }
        for (const mother of family.getWives(this.gedcom)) {
          this.amount++
          this.countAncestors(mother)
        }
      }
    }
  }

  private countDescendants(person: Person): void {
    if (this.amount <= 100) {
      for (const family of person.getSpouseFamilies(this.gedcom)) {
        for (const child of family.getChildren(this.gedcom)) {
          this.amount++
          this.countDescendants(child)
        }
      }
    }
  }

  private isDead(): boolean {
    for (const fact of this.person.getEventsFacts()) {
      if (fact.getTag() === 'DEAT' || fact.getTag() === 'BURI') return true
    }
    return false
  }

  isFulcrumNode(): boolean {
    return this.type === Card.FULCRUM
  }

  centerRelX(): number {
    return this.width / 2
  }
  centerRelY(): number {
    return this.height / 2
  }
  simpleCenterX(): number {
    return this.x + this.width / 2
  }

  setX(x: number): void {
    this.force += x - this.x
    this.x = x
  }

  setY(y: number): void {
    this.y = y
  }

  getLeftWidth(_branch: Branch): number {
    return this.centerRelX()
  }

  toString(): string {
    if (this.mini) {
      return `${this.amount} (${essence(this.person)})`
    }
    let txt = ' ' + essence(this.person)
    if (this.duplicate) txt += ' (2)'
    return txt.trim()
  }
}
