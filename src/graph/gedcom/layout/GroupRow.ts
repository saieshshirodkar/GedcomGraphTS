import { Group } from './Group'

export class GroupRow extends Array<Group> {
  generation: number

  constructor(generation: number) {
    super()
    this.generation = generation
  }

  placeAncestors(): void {
    for (const group of this) {
      group.placeAncestors()
    }
  }

  toString(): string {
    const parts = this.map(g => String(g))
    return this.generation + ': <' + parts.join(', ') + '>'
  }
}
