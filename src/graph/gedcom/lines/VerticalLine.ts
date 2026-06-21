import { Line } from '../core/Line'
import type { Bond } from '../nodes/Bond'
import type { FamilyNode } from '../nodes/FamilyNode'

export class VerticalLine extends Line {
  bond: Bond

  constructor(familyNode: FamilyNode) {
    super()
    this.bond = familyNode.bond!
  }

  update(): void {
    this.x1 = this.bond.centerX()
    this.y1 = this.bond.centerY()
    this.x2 = this.bond.centerX()
    this.y2 = this.bond.y + this.bond.height
  }
}
