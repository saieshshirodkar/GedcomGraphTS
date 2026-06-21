export abstract class Line {
  x1 = 0
  y1 = 0
  x2 = 0
  y2 = 0

  abstract update(): void

  compareTo(other: Line): number {
    return Math.min(this.x1, this.x2) - Math.min(other.x1, other.x2)
  }

  toString(): string {
    return `${this.x1}/${this.y1} - ${this.x2}/${this.y2}`
  }
}
