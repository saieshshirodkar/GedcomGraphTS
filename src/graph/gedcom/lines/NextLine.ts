import { Line } from '../core/Line'
import type { Bond } from '../nodes/Bond'
import type { PersonNode } from '../nodes/PersonNode'
import type { FamilyNode } from '../nodes/FamilyNode'
import { Side } from '../config/Util'

export class NextLine extends Line {
  bond: Bond
  partner: PersonNode
  side: Side
  leftToRight: boolean

  constructor(familyNode: FamilyNode) {
    super()
    this.bond = familyNode.bond!
    this.partner = familyNode.partners[0]
    this.side = familyNode.side
    this.leftToRight = familyNode.leftToRight
  }

  update(): void {
    if (this.bond) {
      this.x1 = this.bond.centerX()
      this.y1 = this.bond.centerY()
      if (this.leftToRight) {
        this.x2 = this.side === Side.LEFT ? this.bond.x : this.partner.x
      } else {
        this.x2 = this.side === Side.RIGHT ? this.bond.x : this.partner.x
      }
      this.y2 = this.partner.centerY()
    }
  }
}
