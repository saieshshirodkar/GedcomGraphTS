import { Line } from '../core/Line'
import type { Bond } from '../nodes/Bond'
import type { FamilyNode } from '../nodes/FamilyNode'
import { Match, Side } from '../config/Util'

export class BackLine extends Line {
  bond: Bond
  side: Side
  match: Match
  noPartners: boolean
  leftToRight: boolean
  node: FamilyNode

  constructor(familyNode: FamilyNode) {
    super()
    this.bond = familyNode.bond!
    this.side = familyNode.side
    this.match = familyNode.match
    this.noPartners = familyNode.partners.length === 0
    this.leftToRight = familyNode.leftToRight
    this.node = familyNode
  }

  update(): void {
    if (!this.bond) return
    if (this.leftToRight) {
      this.x1 = this.side === Side.LEFT ? this.node.next!.x : this.node.prev!.x + this.node.prev!.width
    } else {
      this.x1 = this.side === Side.RIGHT ? this.node.prev!.x : this.node.next!.x + this.node.next!.width
    }
    this.y1 = this.bond.centerY()
    if (this.leftToRight) {
      if (this.bond.marriageDate) {
        this.x2 = this.side === Side.LEFT ? this.bond.x + this.bond.width : this.bond.x
      } else {
        this.x2 =
          this.noPartners && this.match === Match.MIDDLE
            ? this.side === Side.LEFT
              ? this.bond.x + this.bond.overlap
              : this.bond.x + this.bond.width - this.bond.overlap
            : this.bond.centerX()
      }
    } else {
      if (this.bond.marriageDate) {
        this.x2 = this.side === Side.RIGHT ? this.bond.x + this.bond.width : this.bond.x
      } else {
        this.x2 =
          this.noPartners && this.match === Match.MIDDLE
            ? this.side === Side.RIGHT
              ? this.bond.x + this.bond.overlap
              : this.bond.x + this.bond.width - this.bond.overlap
            : this.bond.centerX()
      }
    }
    this.y2 = this.bond.centerY()
  }
}
