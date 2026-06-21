import type { Person, Family } from '../model/types'
import type { Graph } from './Graph'
import type { Node } from '../core/Node'
import type { PersonNode } from '../nodes/PersonNode'
import type { Group } from '../layout/Group'
import { Genus } from '../layout/Genus'
import { Card, Match, Side, Branch, Gender } from '../config/Util'

export class TreeWalker {
  private g: Graph

  constructor(graph: Graph) {
    this.g = graph
  }

  walk(fulcrum: Person): void {
    this.g.fulcrum = fulcrum

    this.g.animator.nodes.length = 0
    this.g.animator.personNodes.length = 0
    this.g.animator.bonds.length = 0
    this.g.animator.groups.length = 0
    this.g.animator.duplicateLines.length = 0
    this.g.maxAbove = 0
    this.g.maxBelow = 0

    const parentFamilies = fulcrum.getParentFamilies(this.g.gedcom)
    this.g.fulcrumGroup = this.g.createGroup(0, false, Branch.NONE)
    if (parentFamilies.length > 0) {
      if (this.g.whichFamily >= parentFamilies.length) this.g.whichFamily = parentFamilies.length - 1
      else if (this.g.whichFamily < 0) this.g.whichFamily = 0
      const parentFamily = parentFamilies[this.g.whichFamily]
      const parentMini = this.g.ancestorGenerations === 0
      let firstParentGroup: Group | null = null
      const parentNode = this.g.createNodeFromFamily(parentFamily, -1, parentMini ? Card.ANCESTRY : Card.REGULAR)
      const parentSize = parentNode.getPersonNodes().length
      const first = parentNode.getPartner(0)
      const second = parentNode.getPartner(1)
      const parentSiblings = this.g.areSiblings(first, second)
      if (parentSize > 0 && this.g.ancestorGenerations > 0) {
        parentNode.isAncestor = true
        if (parentSiblings && second) second.origin = parentNode
        firstParentGroup = this.g.createGroup(-1, parentMini, Branch.NONE)
        firstParentGroup.branch = parentSize > 1 && !parentSiblings ? Branch.PATER : Branch.NONE
        firstParentGroup.addNode(parentNode)
        if (!parentMini) this.g.maxAbove = 1
        this.findAncestors(first!, firstParentGroup, 1, parentSiblings)
        this.findUncles(first!, firstParentGroup, parentSize === 1 || parentSiblings ? Side.LEFT : Side.NONE)
        this.findAncestorGenus(first!, firstParentGroup, Side.LEFT)
        this.findHalfSiblings(first!, parentFamily, parentSize === 1 ? Side.LEFT : Side.NONE)
      }
      const fulcrumGenus = this.findPersonGenus(fulcrum, parentNode, 0, Card.FULCRUM, null)
      for (const sibling of parentFamily.getChildren(this.g.gedcom)) {
        if (sibling.getId() === fulcrum.getId()) {
          for (const node of fulcrumGenus) {
            this.g.fulcrumGroup.addNode(node)
            this.findDescendants(node, 0, this.g.descendantGenerations + 1, false)
          }
        } else if (this.g.siblingNephewGenerations > 0 && !fulcrumGenus.contains(sibling)) {
          const siblingGenus = this.findPersonGenus(sibling, parentNode, 0, Card.REGULAR, this.g.fulcrumGroup)
          for (const siblingNode of siblingGenus) {
            this.findDescendants(siblingNode, 0, this.g.siblingNephewGenerations, false)
          }
        }
      }
      if (parentSize > 0 && this.g.ancestorGenerations > 0) {
        if (!second) {
          this.findHalfSiblings(first!, parentFamily, Side.RIGHT)
          this.findUncles(first!, firstParentGroup!, Side.RIGHT)
        } else if (parentSiblings) {
          this.findHalfSiblings(second, parentFamily, Side.NONE)
          this.findAncestors(second, firstParentGroup!, 1, true)
          this.findAncestorGenus(second, firstParentGroup!, Side.RIGHT)
          this.findUncles(first!, firstParentGroup!, Side.RIGHT)
        } else {
          const secondParentGroup = this.g.createGroup(-1, parentMini, Branch.MATER)
          secondParentGroup.addNode(parentNode)
          this.findHalfSiblings(second, parentFamily, Side.NONE)
          this.findAncestors(second, secondParentGroup, 1, false)
          this.findAncestorGenus(second, secondParentGroup, Side.RIGHT)
          this.findUncles(second, secondParentGroup, Side.NONE)
        }
      }
    } else {
      const fulcrumGenus = this.findPersonGenus(fulcrum, null, 0, Card.FULCRUM, this.g.fulcrumGroup)
      for (const node of fulcrumGenus) {
        this.findDescendants(node, 0, this.g.descendantGenerations + 1, false)
      }
    }
  }

  private findAncestors(commonNode: PersonNode, group: Group, generationUp: number, siblingPartner: boolean): void {
    const partners = commonNode.getFamilyNode().getPersonNodes()
    if (siblingPartner && partners.indexOf(commonNode) === 1) {
      commonNode.origin = partners[0].origin
      return
    }
    if (commonNode.duplicate) return
    const parentFamilies = commonNode.person.getParentFamilies(this.g.gedcom)
    if (parentFamilies.length > 0) {
      const family = parentFamilies[parentFamilies.length - 1]
      const parentGen = generationUp + 1
      const parentMini = parentGen > this.g.ancestorGenerations
      const firstParentGroup = this.g.createGroup(-parentGen, parentMini, Branch.NONE)
      const parentNode = this.g.createNodeFromFamily(family, -parentGen, parentMini ? Card.ANCESTRY : Card.REGULAR)
      commonNode.origin = parentNode
      if (generationUp > 1) {
        if (commonNode.getFamilyNode().getPersonNodes().length > 1 && !siblingPartner) {
          this.findUncles(commonNode, group, Side.NONE)
        } else {
          this.findUncles(commonNode, group, Side.LEFT)
          this.findUncles(commonNode, group, Side.RIGHT)
        }
      }
      const parentSize = parentNode.getPersonNodes().length
      if (parentSize === 0) return
      parentNode.isAncestor = true
      const first = parentNode.getPartner(0)
      const second = parentSize > 1 ? parentNode.getPartner(1) : null
      const siblingParents = this.g.areSiblings(first, second)
      firstParentGroup.branch = parentSize > 1 && !siblingParents ? Branch.PATER : Branch.NONE
      firstParentGroup.addNode(parentNode)
      if (parentGen > this.g.maxAbove && !parentMini) this.g.maxAbove = parentGen
      if (generationUp < this.g.ancestorGenerations) {
        if (second) {
          this.findAncestors(first!, firstParentGroup, parentGen, siblingParents)
          this.findAncestorGenus(first!, firstParentGroup, Side.LEFT)
          if (siblingParents) {
            this.findAncestors(second, firstParentGroup, parentGen, true)
            this.findAncestorGenus(second, firstParentGroup, Side.RIGHT)
          } else {
            const secondParentGroup = this.g.createGroup(-parentGen, parentMini, Branch.MATER)
            secondParentGroup.addNode(parentNode)
            this.findAncestors(second, secondParentGroup, parentGen, false)
            this.findAncestorGenus(second, secondParentGroup, Side.RIGHT)
          }
        } else {
          this.findAncestors(first!, firstParentGroup, parentGen, false)
          this.findAncestorGenus(first!, firstParentGroup, Gender.isFemale(first!.person) ? Side.RIGHT : Side.LEFT)
        }
      }
    }
  }

  private findAncestorGenus(personNode: PersonNode, group: Group, side: Side): void {
    const genus = new Genus()
    genus.push(personNode.familyNode!)
    if (personNode.type === Card.REGULAR && this.g.withSpouses && !personNode.duplicate) {
      const families = personNode.person.getSpouseFamilies(this.g.gedcom)
      if (families.length > 1) {
        families.splice(
          families.findIndex(f => f.getId() === personNode.spouseFamily!.getId()),
          1,
        )
        const generation = personNode.generation
        for (let i = 0; i < families.length; i++) {
          const nextFamily = families[i]
          const match = Match.getForAncestors(families.length, i, side)
          const nextFamilyNode = this.g.createNextFamilyNode(
            nextFamily,
            personNode.person,
            generation,
            side,
            match,
            personNode.origin,
          )
          if (side === Side.LEFT) {
            group.addNode(nextFamilyNode, group.list.indexOf(personNode.familyNode!))
            genus.splice(genus.indexOf(personNode.familyNode!), 0, nextFamilyNode)
          } else {
            group.addNode(nextFamilyNode, group.list.indexOf(personNode.familyNode!) + genus.length)
            genus.push(nextFamilyNode)
          }
        }
        for (const node of genus) {
          if (node !== personNode.familyNode) {
            if (generation < -1) {
              if (this.g.withNumbers && -generation <= this.g.greatUnclesGenerations + 1)
                this.findDescendants(node, generation, 0, false)
            } else if (this.g.siblingNephewGenerations > 0) {
              this.findDescendants(node, -1, this.g.siblingNephewGenerations + 1, side === Side.LEFT)
            }
          }
        }
      }
    }
  }

  private findUncles(personNode: PersonNode, group: Group, side: Side): void {
    const generationUp = -personNode.generation
    if (generationUp <= this.g.greatUnclesGenerations || (generationUp === 1 && this.g.uncleCousinGenerations > 0)) {
      const origin = personNode.origin
      if (origin) {
        const branch = group.branch
        const person = personNode.person
        const uncles = origin.spouseFamily!.getChildren(this.g.gedcom)
        let start = 0
        let end = uncles.length
        if (branch === Branch.NONE) {
          if (side === Side.LEFT) end = uncles.findIndex(u => u.getId() === person.getId())
          else if (side === Side.RIGHT) start = uncles.findIndex(u => u.getId() === person.getId()) + 1
        }
        let position = 0
        for (let i = start; i < end; i++) {
          const uncle = uncles[i]
          if (!group.contains(uncle)) {
            const uncleGenus = this.findPersonGenus(uncle, origin, -generationUp, Card.REGULAR, null)
            for (const uncleNode of uncleGenus) {
              if (branch === Branch.PATER || (branch === Branch.NONE && side === Side.LEFT)) {
                group.addNode(uncleNode, position++)
              } else {
                group.addNode(uncleNode)
              }
              if (generationUp === 1) this.findDescendants(uncleNode, -1, this.g.uncleCousinGenerations, position > 0)
              else this.findDescendants(uncleNode, -generationUp, 1, false)
            }
          }
        }
      }
    }
  }

  private findHalfSiblings(parentNode: PersonNode, excluded: Family, side: Side): void {
    if (!this.g.withSpouses) {
      const halfSiblings: Person[] = []
      const families = parentNode.person.getSpouseFamilies(this.g.gedcom)
      let start = 0
      let end = families.length
      if (side === Side.LEFT) {
        end = families.indexOf(excluded)
      } else if (side === Side.RIGHT) {
        start = families.indexOf(excluded) + 1
      }
      for (let i = start; i < end; i++) {
        const family = families[i]
        if (family.getId() !== excluded.getId()) halfSiblings.push(...family.getChildren(this.g.gedcom))
      }
      for (const halfSibling of halfSiblings) {
        if (this.g.siblingNephewGenerations > 0) {
          const halfSiblingGenus = this.findPersonGenus(halfSibling, parentNode, 0, Card.REGULAR, this.g.fulcrumGroup)
          for (const halfSiblingNode of halfSiblingGenus) {
            ;(halfSiblingNode as PersonNode).isHalfSibling = true
            this.findDescendants(halfSiblingNode, 0, this.g.siblingNephewGenerations, false)
          }
        }
      }
    }
  }

  private findDescendants(commonNode: Node, startGeneration: number, maxGenerations: number, toTheLeft: boolean): void {
    if (!commonNode.isDuplicate()) {
      const children: Person[] = []
      if (commonNode.spouseFamily) {
        children.push(...commonNode.spouseFamily.getChildren(this.g.gedcom))
      } else {
        for (const family of (commonNode as PersonNode).person.getSpouseFamilies(this.g.gedcom))
          children.push(...family.getChildren(this.g.gedcom))
      }
      if (children.length > 0) {
        const childGeneration = commonNode.generation + 1
        const childMini = childGeneration >= maxGenerations + startGeneration
        if (childMini && !this.g.withNumbers) return
        if (!childMini && childGeneration > this.g.maxBelow) this.g.maxBelow = childGeneration
        const childGroup = this.g.createGroup(childGeneration, childMini, Branch.NONE, toTheLeft)
        for (const child of children) {
          if (child) {
            const childGenus = this.findPersonGenus(
              child,
              commonNode,
              childGeneration,
              childMini ? Card.PROGENY : Card.REGULAR,
              childGroup,
            )
            if (childGenus && !childMini) {
              for (const childNode of childGenus) {
                this.findDescendants(childNode, startGeneration, maxGenerations, false)
              }
            }
          }
        }
      }
    }
  }

  private findPersonGenus(
    person: Person,
    parentNode: Node | null,
    generation: number,
    type: Card,
    group: Group | null,
  ): Genus {
    const genus = new Genus()
    if (group && group.contains(person)) return genus
    const families = person.getSpouseFamilies(this.g.gedcom)
    if (families.length === 0 || !this.g.withSpouses || type === Card.PROGENY) {
      const singleNode = this.g.createNodeFromPerson(person, null, parentNode, generation, type, Match.MAIN)
      if (group) group.addNode(singleNode)
      genus.push(singleNode)
    } else {
      const side = Gender.isFemale(person) ? Side.RIGHT : Side.LEFT
      let straight = true
      if (families.length > 1) {
        if (
          (side === Side.LEFT &&
            this.g.getSpouses(families[families.length - 1], null).findIndex(p => p.getId() === person.getId()) ===
              1) ||
          (side === Side.RIGHT &&
            this.g.getSpouses(families[0], null).findIndex(p => p.getId() === person.getId()) === 0)
        ) {
          straight = false
        }
      }
      for (let i = 0; i < families.length; i++) {
        const family = families[i]
        const match = Match.get(families.length, i, side, straight)
        let partnerNode: Node
        if (match === Match.MAIN) {
          partnerNode = this.g.createNodeFromPerson(person, family, parentNode, generation, type, match)
        } else {
          partnerNode = this.g.createNextFamilyNode(family, person, generation, side, match, parentNode)
        }
        if (group) group.addNode(partnerNode)
        genus.push(partnerNode)
      }
    }
    return genus
  }
}
