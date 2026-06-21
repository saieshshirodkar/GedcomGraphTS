import { Metric } from '../core/Metric'
import type { Node } from '../core/Node'
import type { Group } from './Group'
import { HORIZONTAL_SPACE, UNION_DISTANCE } from '../config/Util'

export class Union extends Metric {
  list: Node[] = []
  generation: number
  ancestor: Node | null = null
  prev: Union | null = null
  next: Union | null = null
  descendants: Union[] | null = null
  youths: Group[] | null = null
  columnShift = 0

  constructor(generation: number) {
    super()
    this.generation = generation
    this.list = []
  }

  getOrigins(): Node[] {
    return this.ancestor ? this.ancestor.getOrigins() : []
  }

  updateX(): void {
    this.x = this.list[0].x
  }

  initializeDescendants(): void {
    if (this.generation < 0) {
      this.descendants = []
      let union: Union = this
      while (union.generation < -1) {
        union = union.ancestor!.youth!.list[0].union!
        this.descendants.push(union)
      }
    }
  }

  initializeYouths(): void {
    this.youths = []
    for (const node of this.list) {
      if (node.youth && !node.youth.mini) this.youths.push(node.youth)
    }
  }

  placeOriginsAscending(): void {
    const origins = this.getOrigins()
    if (origins.length > 1) {
      const leftUnion = origins[0].union!
      const rightUnion = origins[1].union!
      leftUnion.updateX()
      rightUnion.updateX()
      const overlap = leftUnion.x + leftUnion.getWidth() + UNION_DISTANCE - rightUnion.x
      if (overlap > 0) {
        leftUnion.moveAscending(-overlap / 2)
        rightUnion.moveAscending(overlap / 2)
      }
    }
  }

  moveAscending(shift: number): void {
    this.updateX()
    this.setX(this.x + shift)
    if (this.ancestor) {
      for (const origin of this.ancestor.getOrigins()) {
        origin.union!.moveAscending(shift)
      }
    }
  }

  moveDescending(shift: number): void {
    this.setX(this.x + shift)
    for (const node of this.list) {
      if (node.youth) node.youth.moveDescending(shift)
    }
  }

  outdistanceAncestorColumn(): void {
    if (!this.ancestor || !this.ancestor.youth) return
    this.columnShift = 0
    this.ancestor.youth.updateX()
    const youthDistance = this.ancestor.youth.centerX() - this.centerX()
    if (this.prev && this.prev.descendants![0] === this.descendants![0]) {
      const leftShift = this.prev.x + this.prev.getWidth() + UNION_DISTANCE - this.x
      this.columnShift = Math.max(leftShift, youthDistance)
    }
    if (this.next && this.next.descendants![0] === this.descendants![0]) {
      const rightShift = this.next.x - this.x - this.getWidth() - UNION_DISTANCE
      this.columnShift = Math.min(rightShift, youthDistance)
    }
    this.findAncestorColumnShift(this.ancestor!)
    if (this.columnShift !== 0) {
      this.moveAscending(this.columnShift)
    }
  }

  private findAncestorColumnShift(node: Node): void {
    for (const origin of node.getOrigins()) {
      const prev = origin.union!.prev
      if (prev && !prev.descendants!.includes(this)) {
        const leftShift = prev.x + prev.getWidth() + UNION_DISTANCE - origin.union!.x
        if (leftShift > this.columnShift) this.columnShift = leftShift
      }
      const next = origin.union!.next
      if (next && !next.descendants!.includes(this)) {
        const rightShift = next.x - origin.union!.x - origin.union!.getWidth() - UNION_DISTANCE
        if (rightShift < this.columnShift) this.columnShift = rightShift
      }
      this.findAncestorColumnShift(origin)
    }
  }

  alignBetweenOrigins(): number {
    const origins = this.getOrigins()
    if (origins.length > 1) {
      const firstOrigin = origins[0]
      const secondOrigin = origins[1]
      const origin1X = firstOrigin.centerX()
      const origin2X = secondOrigin.centerX()
      this.updateX()
      firstOrigin.youth!.updateX()
      secondOrigin.youth!.updateX()
      const youthsDistance = secondOrigin.youth!.centerX() - firstOrigin.youth!.centerX()
      const discrepancy = origin2X - origin1X - youthsDistance
      return origin1X - firstOrigin.youth!.centerRelX() - this.x + discrepancy / 2
    } else if (origins.length > 0) {
      const origin = origins[0]
      if (origin.union) {
        origin.youth!.updateX()
        return origin.centerX() - origin.youth!.centerX()
      }
    }
    return 0
  }

  distributeNodesOverYouth(): void {
    if (!this.youths || this.youths.length === 0) return
    for (const youth of this.youths) {
      youth.updateX()
      youth.origin!.setX(youth.centerX() - youth.origin!.centerRelX())
    }
    let node = this.youths[0].origin!
    while (node.prev && node.prev.union === this) {
      node.prev.setX(node.x - HORIZONTAL_SPACE - node.prev.width)
      node = node.prev
    }
    for (let i = 0; i < this.youths.length - 1; i++) {
      const left = this.youths[i].origin!
      const right = this.youths[i + 1].origin!
      node = left.next!
      while (node && node !== right) {
        const space = node.next!.x - node.prev!.x - node.prev!.width - node.width
        node.setX(node.prev!.x + node.prev!.width + space / 2)
        node = node.next!
      }
    }
    node = this.youths[this.youths.length - 1].origin!
    while (node.next && node.next.union === this) {
      node.next.setX(node.x + node.width + HORIZONTAL_SPACE)
      node = node.next
    }
  }

  centerRelX(): number {
    return this.ancestor!.centerX() - this.x
  }

  centerRelY(): number {
    return this.getHeight() / 2
  }

  setX(x: number): void {
    const diff = x - this.x
    for (const node of this.list) {
      node.setX(node.x + diff)
    }
    this.x = x
  }

  setY(y: number): void {
    for (const node of this.list) {
      node.setY(y)
    }
    this.y = y
  }

  getWidth(): number {
    const lastChild = this.list[this.list.length - 1]
    this.width = this.list.length === 1 ? lastChild.width : lastChild.x + lastChild.width - this.x
    return this.width
  }

  getHeight(): number {
    let h = 0
    for (const node of this.list) h = Math.max(h, node.height)
    return h
  }

  toString(): string {
    return String(this.list)
  }
}
