import { Metric } from '../core/Metric'
import type { FamilyNode } from './FamilyNode'

export class Bond extends Metric {
  marriageDate: string | null = null
  familyNode: FamilyNode
  overlap = 0

  constructor(familyNode: FamilyNode) {
    super()
    this.familyNode = familyNode
  }

  centerRelX(): number {
    return this.width / 2
  }
  centerRelY(): number {
    return this.height / 2
  }
  setX(x: number): void {
    this.x = x - this.overlap
  }
  setY(y: number): void {
    this.y = y
  }

  marriageYear(): string {
    if (!this.marriageDate) return ''
    const i = this.marriageDate.lastIndexOf(' ')
    return i > 0 ? this.marriageDate.substring(i) : this.marriageDate
  }

  toString(): string {
    const txt = this.marriageYear()
    return txt || '-•-'
  }
}
