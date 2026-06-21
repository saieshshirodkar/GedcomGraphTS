import type { Family } from '../model/types'
import { Metric } from './Metric'
import { Branch, Match, HORIZONTAL_SPACE, UNION_DISTANCE, ANCESTRY_DISTANCE, PROGENY_PLAY } from '../config/Util'
import type { Group } from '../layout/Group'
import type { Union } from '../layout/Union'
import { FamilyNode } from '../nodes/FamilyNode'
import type { PersonNode } from '../nodes/PersonNode'

export abstract class Node extends Metric {
  spouseFamily: Family | null = null
  group: Group | null = null
  youth: Group | null = null
  generation = 0
  mini = false
  isAncestor = false
  marriedSiblings = false
  union: Union | null = null
  prev: Node | null = null
  next: Node | null = null
  match: Match = Match.MAIN
  origins: Node[] | null = null
  force = 0
  columnShift = 0

  abstract getLeftWidth(branch: Branch): number
  abstract simpleCenterX(): number

  moveDescending(shift: number): void {
    this.setX(this.x + shift)
    if (this.youth) {
      for (const child of this.youth.list) {
        child.moveDescending(shift)
      }
    }
  }

  placeYouthX(): void {
    if (this.youth && !this.youth.mini) {
      this.youth.placeNodes(this.centerX())
    }
  }

  placeMiniChildrenX(): void {
    if (this.youth && this.youth.mini) {
      let posX = this.centerX()
      for (const child of this.youth.list) {
        child.x = posX
        posX += child.width + PROGENY_PLAY
      }
      this.youth.updateX()
      this.youth.setX(this.youth.x - this.youth.getWidth() / 2)
    }
  }

  placeAcquiredOriginX(): void {
    if (this instanceof FamilyNode) {
      for (const partner of (this as FamilyNode).partners) {
        if (partner.acquired && partner.origin) {
          partner.origin.setX(partner.centerX() - partner.origin.centerRelX())
        }
      }
    }
  }

  placeAcquiredOriginY(): void {
    if (this instanceof FamilyNode && !this.mini) {
      for (const partner of (this as FamilyNode).partners) {
        if (partner.acquired && partner.origin) {
          partner.origin.setY(partner.y - ANCESTRY_DISTANCE - partner.origin.height)
        }
      }
    }
  }

  alignMiniEmptyOverYouth(): void {
    if (this.youth && this.youth.isOriginMiniOrEmpty()) {
      this.youth.updateX()
      this.setX(this.youth.centerX() - this.centerRelX())
    }
  }

  slide(shift: number): void {
    this.setX(this.x + shift)
    if (shift > 0 && this.next) {
      const rightOver =
        this.x + this.width + (this.union === this.next.union ? HORIZONTAL_SPACE : UNION_DISTANCE) - this.next.x
      if (rightOver > 0) this.next.slide(rightOver)
    } else if (shift < 0 && this.prev) {
      const leftOver =
        this.prev.x + this.prev.width + (this.union === this.prev.union ? HORIZONTAL_SPACE : UNION_DISTANCE) - this.x
      if (leftOver > 0) this.prev.slide(-leftOver)
    }
  }

  abstract getOrigin(): Node | null
  abstract getOrigins(): Node[]
  abstract isDuplicate(): boolean
  abstract getFamilyNode(): Node
  abstract getPersonNodes(): PersonNode[]
  abstract getMainPersonNode(): PersonNode | null
  abstract getHusband(): PersonNode | null
  abstract getWife(): PersonNode | null
  abstract getPartner(id: number): PersonNode | null

  isMultiMarriage(): boolean {
    return this.match === Match.FAR || this.match === Match.MIDDLE || this.match === Match.NEAR
  }

  initializeOrigins(): void {
    if (this.generation >= -1 && !this.mini) {
      this.origins = []
      let node: Node | null = this as Node
      while (node && node.generation >= 0) {
        node = node.group ? node.group.origin : null
        if (node && !node.mini) this.origins.push(node)
      }
    }
  }

  outdistanceDescendantColumn(): void {
    if (this.youth && !this.youth.mini) {
      this.columnShift = 0
      if (this.prev && this.union === this.prev.union) {
        this.columnShift = this.prev.x + this.prev.width + HORIZONTAL_SPACE - this.x
      }
      this.findDescendantColumnShift(this)
      if (this.columnShift !== 0) {
        this.moveDescending(this.columnShift)
      }
    }
  }

  private findDescendantColumnShift(node: Node): void {
    if (node.youth && !node.youth.mini) {
      const first = node.youth.list[0]
      if (first.prev && first.prev.origins && !first.prev.origins.includes(this)) {
        const leftShift = first.prev.x + first.prev.width + UNION_DISTANCE - first.x
        if (leftShift > this.columnShift) {
          this.columnShift = leftShift
        }
      }
      for (const youthNode of node.youth.list) {
        this.findDescendantColumnShift(youthNode)
      }
    }
  }
}
