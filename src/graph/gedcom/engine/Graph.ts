import type { Gedcom, Family, Person } from '../model/types'
import type { Node } from '../core/Node'
import { FamilyNode } from '../nodes/FamilyNode'
import { PersonNode } from '../nodes/PersonNode'
import { Group } from '../layout/Group'
import type { Bond } from '../nodes/Bond'
import { DuplicateLine } from '../lines/DuplicateLine'
import type { Line } from '../core/Line'
import { Animator } from './Animator'
import { TreeWalker } from './TreeWalker'
import {
  Card,
  Match,
  Side,
  Branch,
  VERTICAL_SPACE,
  LITTLE_GROUP_DISTANCE,
  setVerticalSpaceCalc,
  setLittleGroupDistanceCalc,
} from '../config/Util'

export class Graph {
  fulcrum: Person | null = null
  whichFamily = 0

  ancestorGenerations = 3
  greatUnclesGenerations = 2
  withSpouses = true
  descendantGenerations = 3
  siblingNephewGenerations = 2
  uncleCousinGenerations = 2
  withNumbers = true
  withDuplicateLines = true

  gedcom!: Gedcom
  readonly animator: Animator
  fulcrumGroup!: Group
  maxAbove = 0
  maxBelow = 0
  leftToRight = false

  constructor() {
    this.animator = new Animator()
  }

  setGedcom(gedcom: Gedcom): this {
    this.gedcom = gedcom
    return this
  }

  showFamily(num: number): this {
    this.whichFamily = num
    return this
  }

  maxAncestors(num: number): this {
    this.ancestorGenerations = num
    return this
  }

  maxGreatUncles(num: number): this {
    this.greatUnclesGenerations = num
    return this
  }

  displaySpouses(display: boolean): this {
    this.withSpouses = display
    return this
  }

  maxDescendants(num: number): this {
    this.descendantGenerations = num
    return this
  }

  maxSiblingsNephews(num: number): this {
    this.siblingNephewGenerations = num
    return this
  }

  maxUnclesCousins(num: number): this {
    this.uncleCousinGenerations = num
    return this
  }

  displayNumbers(display: boolean): this {
    this.withNumbers = display
    setVerticalSpaceCalc(display ? VERTICAL_SPACE : VERTICAL_SPACE / 2)
    setLittleGroupDistanceCalc(display ? LITTLE_GROUP_DISTANCE : LITTLE_GROUP_DISTANCE / 2)
    return this
  }

  displayDuplicateLines(display: boolean): this {
    this.withDuplicateLines = display
    return this
  }

  setLayoutDirection(leftToRight: boolean): this {
    this.leftToRight = leftToRight
    this.animator.leftToRight = leftToRight
    return this
  }

  getWidth(): number {
    return this.animator.width
  }
  getHeight(): number {
    return this.animator.height
  }

  getPersonNodes(): PersonNode[] {
    return this.animator.personNodes
  }
  getBonds(): Bond[] {
    return this.animator.bonds
  }

  needMaxBitmapSize(): boolean {
    return this.animator.maxBitmapSize === 0
  }

  setMaxBitmapSize(size: number): void {
    this.animator.maxBitmapSize = size
  }
  getMaxBitmapSize(): number {
    return this.animator.maxBitmapSize
  }
  getBiggestPathSize(): number {
    return this.animator.biggestPathSize
  }

  getLines(): Set<Line>[] {
    return this.animator.lineGroups
  }
  getBackLines(): Set<Line>[] {
    return this.animator.backLineGroups
  }
  getDuplicateLines(): DuplicateLine[] {
    return this.animator.duplicateLines
  }

  initNodes(): void {
    this.animator.initNodes(this.fulcrumGroup, this.maxAbove, this.maxBelow, this.withNumbers)
  }

  placeNodes(): void {
    this.animator.placeNodes()
  }

  startFrom(fulcrum: Person): void {
    this.fulcrum = fulcrum
    const walker = new TreeWalker(this)
    walker.walk(fulcrum)
  }

  createGroup(generation: number, mini: boolean, branch: Branch, beforeFulcrumGroup = false): Group {
    const group = new Group(generation, mini, branch)
    if (beforeFulcrumGroup) {
      const index = this.animator.groups.indexOf(this.fulcrumGroup)
      this.animator.groups.splice(index, 0, group)
    } else {
      this.animator.groups.push(group)
    }
    return group
  }

  createNodeFromPerson(
    person: Person,
    spouseFamily: Family | null,
    parentNode: Node | null,
    generation: number,
    type: Card,
    match: Match,
  ): Node {
    const personNode = new PersonNode(this.gedcom, person, type)
    personNode.generation = generation
    personNode.origin = parentNode
    personNode.match = match
    this.checkForDuplicate(personNode, spouseFamily)

    let familyNode: FamilyNode | null = null
    if ((type === Card.FULCRUM || type === Card.REGULAR) && spouseFamily && !personNode.duplicate) {
      const spouses = this.getSpouses(spouseFamily, null)
      if (spouses.length > 1 && this.withSpouses) {
        familyNode = new FamilyNode(spouseFamily, false, Side.NONE, this.leftToRight)
        familyNode.generation = generation
        familyNode.match = match
        for (const spouse of spouses) {
          if (spouse.getId() === person.getId() && !familyNode.partners.includes(personNode)) {
            familyNode.addPartner(personNode)
          } else {
            const partnerNode = new PersonNode(this.gedcom, spouse, Card.REGULAR)
            partnerNode.generation = generation
            familyNode.addPartner(partnerNode)
            if (
              parentNode &&
              spouse.getParentFamilies(this.gedcom).some(f => f.getId() === parentNode.spouseFamily!.getId())
            ) {
              partnerNode.origin = parentNode
            } else {
              this.findAcquiredAncestry(partnerNode)
            }
            this.checkForDuplicate(partnerNode, spouseFamily)
          }
        }
        familyNode.createBond()
      } else {
        personNode.spouseFamily = spouseFamily
      }
    }

    if (familyNode) {
      this.animator.addNode(familyNode)
      return familyNode
    }
    this.animator.addNode(personNode)
    return personNode
  }

  createNodeFromFamily(spouseFamily: Family, generation: number, type: Card): FamilyNode {
    const newNode = new FamilyNode(spouseFamily, type === Card.ANCESTRY, Side.NONE, this.leftToRight)
    newNode.generation = generation
    if (type === Card.REGULAR || this.withNumbers) {
      newNode.match = Match.MAIN
      const spouses = this.getSpouses(spouseFamily, null)
      for (const spouse of spouses) {
        const personNode = new PersonNode(this.gedcom, spouse, type)
        personNode.generation = generation
        this.checkForDuplicate(personNode, spouseFamily)
        newNode.addPartner(personNode)
      }
    }
    newNode.createBond()
    this.animator.addNode(newNode)
    return newNode
  }

  createNextFamilyNode(
    spouseFamily: Family,
    excluded: Person,
    generation: number,
    side: Side,
    match: Match,
    parentNode: Node | null,
  ): FamilyNode {
    const familyNode = new FamilyNode(spouseFamily, false, side, this.leftToRight)
    familyNode.generation = generation
    familyNode.match = match
    if (this.withSpouses) {
      for (const partner of this.getSpouses(spouseFamily, excluded)) {
        const personNode = new PersonNode(this.gedcom, partner, Card.REGULAR)
        personNode.generation = generation
        if (
          parentNode &&
          partner.getParentFamilies(this.gedcom).some(f => f.getId() === parentNode.spouseFamily!.getId())
        ) {
          personNode.origin = parentNode
        } else {
          this.findAcquiredAncestry(personNode)
        }
        familyNode.addPartner(personNode)
        this.checkForDuplicate(personNode, spouseFamily)
      }
    }
    familyNode.createBond()
    this.animator.addNode(familyNode)
    return familyNode
  }

  getSpouses(family: Family, excluded: Person | null): Person[] {
    const spouses: Person[] = []
    const husbandRefs = family.getHusbandRefs()
    const wifeRefs = family.getWifeRefs()
    if (husbandRefs.length > 0) {
      const p = husbandRefs[0].getPerson(this.gedcom)
      if (p) spouses.push(p)
    }
    if (wifeRefs.length > 0) {
      const p = wifeRefs[0].getPerson(this.gedcom)
      if (p) spouses.push(p)
    }
    for (let i = 1; i < husbandRefs.length; i++) {
      const p = husbandRefs[i].getPerson(this.gedcom)
      if (p) spouses.push(p)
    }
    for (let i = 1; i < wifeRefs.length; i++) {
      const p = wifeRefs[i].getPerson(this.gedcom)
      if (p) spouses.push(p)
    }
    for (let i = spouses.length - 1; i >= 0; i--) {
      if (excluded && spouses[i].getId() === excluded.getId()) spouses.splice(i, 1)
    }
    if (spouses.length > 2) spouses.length = 2
    if (excluded && spouses.length === 2) spouses.length = 1
    return spouses
  }

  areSiblings(first: PersonNode | null, second: PersonNode | null): boolean {
    if (first && second) {
      const firstFamilies = first.person.getParentFamilies(this.gedcom)
      const secondFamilies = second.person.getParentFamilies(this.gedcom)
      return (
        firstFamilies.length > 0 &&
        secondFamilies.length > 0 &&
        firstFamilies[firstFamilies.length - 1].getId() === secondFamilies[secondFamilies.length - 1].getId()
      )
    }
    return false
  }

  private checkForDuplicate(newPersonNode: PersonNode, spouseFamily: Family | null): void {
    for (const oldPersonNode of this.animator.personNodes) {
      if (!newPersonNode.mini && !oldPersonNode.mini) {
        if (oldPersonNode.person.getId() === newPersonNode.person.getId()) {
          if (
            !spouseFamily ||
            !oldPersonNode.familyNode ||
            !oldPersonNode.familyNode.spouseFamily ||
            oldPersonNode.familyNode.spouseFamily.getId() === spouseFamily.getId()
          ) {
            newPersonNode.duplicate = true
          }
          if (this.withDuplicateLines) {
            this.animator.duplicateLines.push(new DuplicateLine(oldPersonNode, newPersonNode))
          }
        } else if (
          oldPersonNode.generation === newPersonNode.generation &&
          oldPersonNode.familyNode &&
          oldPersonNode.familyNode.spouseFamily &&
          spouseFamily &&
          oldPersonNode.familyNode.spouseFamily.getId() === spouseFamily.getId()
        ) {
          newPersonNode.duplicate = true
        }
      }
    }
  }

  findAcquiredAncestry(card: PersonNode): void {
    card.acquired = true
    if (this.withNumbers) {
      const parentFamilies = card.person.getParentFamilies(this.gedcom)
      if (parentFamilies.length > 0) {
        const family = parentFamilies[parentFamilies.length - 1]
        const ancestry = this.createNodeFromFamily(family, card.generation - 1, Card.ANCESTRY)
        card.origin = ancestry
        const husband = ancestry.getHusband()
        if (husband) husband.acquired = true
        const wife = ancestry.getWife()
        if (wife) wife.acquired = true
      }
    }
  }

  toString(): string {
    const lines: string[] = []
    for (const node of this.animator.nodes) {
      lines.push(node.generation + ':  | ' + String(node) + ' |')
    }
    return lines.join('\n')
  }
}
