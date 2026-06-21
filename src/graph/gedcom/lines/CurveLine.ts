import { Line } from '../core/Line'
import type { Node } from '../core/Node'
import type { PersonNode } from '../nodes/PersonNode'

export class CurveLine extends Line {
  origin: Node
  personNode: PersonNode

  constructor(personNode: PersonNode) {
    super()
    this.personNode = personNode
    this.origin = personNode.origin!
  }

  update(): void {
    this.x1 = this.origin.simpleCenterX()
    this.y1 = this.origin.y + this.origin.height
    this.x2 = this.personNode.centerX()
    this.y2 = this.personNode.y
  }
}
