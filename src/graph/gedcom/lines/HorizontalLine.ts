import { Line } from '../core/Line'
import type { PersonNode } from '../nodes/PersonNode'
import type { FamilyNode } from '../nodes/FamilyNode'

export class HorizontalLine extends Line {
  leftPerson: PersonNode
  rightPerson: PersonNode
  leftToRight: boolean

  constructor(familyNode: FamilyNode) {
    super()
    this.leftPerson = familyNode.partners[0]
    this.rightPerson = familyNode.partners[1]
    this.leftToRight = familyNode.leftToRight
  }

  update(): void {
    this.x1 = this.leftToRight ? this.leftPerson.x + this.leftPerson.width : this.leftPerson.x
    this.y1 = this.leftPerson.centerY()
    this.x2 = this.leftToRight ? this.rightPerson.x : this.rightPerson.x + this.rightPerson.width
    this.y2 = this.rightPerson.centerY()
  }
}
