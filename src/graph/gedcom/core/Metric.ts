export abstract class Metric {
  x = 0
  y = 0
  width = 0
  height = 0

  abstract centerRelX(): number
  abstract centerRelY(): number

  centerX(): number {
    return this.x + this.centerRelX()
  }

  centerY(): number {
    return this.y + this.centerRelY()
  }

  abstract setX(x: number): void
  abstract setY(y: number): void
}
