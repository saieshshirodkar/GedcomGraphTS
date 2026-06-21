import { Line } from '../core/Line'
import type { PersonNode } from '../nodes/PersonNode'
import { Gender, VERTICAL_SPACE_CALC } from '../config/Util'

export class DuplicateLine extends Line {
  private firstNode: PersonNode
  private secondNode: PersonNode
  gender: Gender
  x3 = 0
  y3 = 0

  constructor(firstNode: PersonNode, secondNode: PersonNode) {
    super()
    this.firstNode = firstNode
    this.secondNode = secondNode
    this.gender = Gender.getGender(firstNode.person)
  }

  update(): void {
    const shift = 1.5
    if (this.firstNode.generation === this.secondNode.generation) {
      if (this.secondNode.x > this.firstNode.x) {
        this.x1 = this.firstNode.x + this.firstNode.width - shift
        this.x2 = this.secondNode.x + shift
      } else {
        this.x1 = this.firstNode.x + shift
        this.x2 = this.secondNode.x + this.secondNode.width - shift
      }
      this.y1 = this.firstNode.y + this.firstNode.height - shift
      this.y2 = this.secondNode.y + this.secondNode.height - shift
      this.x3 = this.x1 + (this.x2 - this.x1) / 2
      this.y3 = Math.max(this.y1, this.y2) + Math.min(VERTICAL_SPACE_CALC, Math.abs(this.x2 - this.x1))
    } else {
      if (this.firstNode.x < this.secondNode.x) {
        if (this.secondNode.x > this.firstNode.x + this.firstNode.width) {
          this.x1 = this.firstNode.x + this.firstNode.width - shift
          this.x2 = this.secondNode.x + shift
        } else {
          this.x1 = this.firstNode.x + (this.firstNode.width / 4) * 3
          this.x2 = this.secondNode.x + this.secondNode.width / 4
        }
      } else {
        if (this.firstNode.x > this.secondNode.x + this.secondNode.width) {
          this.x1 = this.firstNode.x + shift
          this.x2 = this.secondNode.x + this.secondNode.width - shift
        } else {
          this.x1 = this.firstNode.x + this.firstNode.width / 4
          this.x2 = this.secondNode.x + (this.secondNode.width / 4) * 3
        }
      }
      if (this.firstNode.y < this.secondNode.y) {
        this.y1 = this.firstNode.y + this.firstNode.height - shift
        this.y2 = this.secondNode.y + shift
      } else {
        this.y1 = this.firstNode.y + shift
        this.y2 = this.secondNode.y + this.secondNode.height - shift
      }
      this.x3 = this.x1 + (this.x2 - this.x1) / 2
      this.y3 = this.y1 + (this.y2 - this.y1) / 2
    }
  }
}
