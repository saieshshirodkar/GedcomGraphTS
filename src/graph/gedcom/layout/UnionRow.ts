import { Union } from './Union'
import type { Node } from '../core/Node'
import { HORIZONTAL_SPACE, UNION_DISTANCE } from '../config/Util'

export class UnionRow extends Array<Union> {
  generation: number
  yAxe: number
  central: Node | null = null

  constructor(generation: number, yAxe: number) {
    super()
    this.generation = generation
    this.yAxe = yAxe
  }

  addUnion(union: Union): void {
    this.push(union)
  }

  findCentralNode(): void {
    if (this.length === 0) return
    if (this.generation === -1) {
      this.central = this[0].ancestor
    } else {
      const list = this[Math.floor(this.length / 2)].list
      this.central = list[Math.floor(list.length / 2)]
    }
  }

  resolveOverlap(): void {
    if (!this.central) return
    let left = this.central
    while (left.prev) {
      const gap = left.union === left.prev.union ? HORIZONTAL_SPACE : UNION_DISTANCE
      const overlap = left.prev.x + left.prev.width + gap - left.x
      if (overlap > 0) left.prev.slide(-overlap)
      left = left.prev
    }
    let right = this.central!
    while (right.next) {
      const gap = right.union === right.next.union ? HORIZONTAL_SPACE : UNION_DISTANCE
      const overlap = right.x + right.width + gap - right.next.x
      if (overlap > 0) right.next.slide(overlap)
      right = right.next
    }
  }

  placeOriginsAscending(): void {
    for (const union of this) {
      union.placeOriginsAscending()
    }
  }

  outdistanceAncestorColumns(): void {
    for (const union of this) {
      union.outdistanceAncestorColumn()
    }
  }

  outdistanceDescendantColumns(): void {
    for (const union of this) {
      for (const node of union.list) {
        node.outdistanceDescendantColumn()
      }
      union.distributeNodesOverYouth()
    }
  }

  placeYouths(): void {
    for (const union of this) {
      for (const node of union.list) {
        node.placeYouthX()
      }
    }
  }

  toString(): string {
    const parts = this.map(u => String(u))
    return this.generation + ': <' + parts.join(', ') + '>'
  }
}
