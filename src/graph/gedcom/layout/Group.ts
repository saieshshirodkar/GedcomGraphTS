import type { Person } from '../model/types'
import { Metric } from '../core/Metric'
import type { Node } from '../core/Node'
import type { PersonNode } from '../nodes/PersonNode'
import { Branch, HORIZONTAL_SPACE, ANCESTRY_DISTANCE, LITTLE_GROUP_DISTANCE_CALC } from '../config/Util'

export class Group extends Metric {
  list: Node[] = []
  origin: Node | null = null
  first: PersonNode | null = null
  last: PersonNode | null = null
  generation: number
  mini: boolean
  branch: Branch

  constructor(generation: number, mini: boolean, branch: Branch) {
    super()
    this.generation = generation
    this.mini = mini
    this.branch = branch
    this.list = []
  }

  addNode(node: Node, index = -1): void {
    if (index >= 0) this.list.splice(index, 0, node)
    else this.list.push(node)
    node.group = this
  }

  setOrigin(): void {
    let found = false
    for (const node of this.list) {
      if (node.isAncestor && node.getPersonNodes().length > 1) {
        this.origin = node.getPartner(this.branch === Branch.MATER ? 1 : 0)!.getOrigin()
        found = true
      }
    }
    if (!found) {
      for (const node of this.list) {
        const personNode = node.getMainPersonNode()
        if (personNode) {
          this.origin = personNode.getOrigin()
          break
        }
      }
    }
    if (this.origin) this.origin.youth = this

    if (!this.mini) {
      outer: for (const node of this.list) {
        if (node.isAncestor && this.branch === Branch.MATER && !node.marriedSiblings) {
          this.first = node.getWife()
          break
        }
        for (const personNode of node.getPersonNodes()) {
          if (!personNode.acquired) {
            this.first = personNode
            break outer
          }
        }
      }
      outer: for (let i = this.list.length - 1; i >= 0; i--) {
        const node = this.list[i]
        if (node.isAncestor && this.branch === Branch.PATER && !node.marriedSiblings) {
          this.last = node.getHusband()
          break
        }
        const personNodes = node.getPersonNodes()
        for (let j = personNodes.length - 1; j >= 0; j--) {
          const personNode = personNodes[j]
          if (!personNode.acquired) {
            this.last = personNode
            break outer
          }
        }
      }
    }
  }

  isOriginMiniOrEmpty(): boolean {
    if (this.origin) {
      if (this.origin.isMultiMarriage()) return false
      return this.origin.mini || this.origin.getPersonNodes().length === 0
    }
    return false
  }

  contains(person: Person): boolean {
    for (const node of this.list) {
      for (const personNode of node.getPersonNodes()) {
        if (personNode.person.getId() === person.getId()) return true
      }
    }
    return false
  }

  placeNodes(centerX: number): void {
    let posX = centerX - this.getBasicLeftWidth() - this.getBasicCentralWidth() / 2
    for (const child of this.list) {
      child.setX(posX)
      posX += child.width + HORIZONTAL_SPACE
    }
  }

  placeAncestors(): void {
    if (this.origin) {
      this.placeOriginX()
      const union = this.origin.union
      if (union) {
        let posX = this.origin.x
        for (let i = union.list.indexOf(this.origin) - 1; i >= 0; i--) {
          const node = union.list[i]
          posX -= node.width + HORIZONTAL_SPACE
          node.setX(posX)
        }
        posX = this.origin.x + this.origin.width + HORIZONTAL_SPACE
        for (let i = union.list.indexOf(this.origin) + 1; i < union.list.length; i++) {
          const node = union.list[i]
          node.setX(posX)
          posX += node.width + HORIZONTAL_SPACE
        }
      }
    }
  }

  placeOriginX(): void {
    this.origin!.setX(
      this.first!.centerX() + (this.last!.centerX() - this.first!.centerX()) / 2 - this.origin!.centerRelX(),
    )
  }

  placeOriginY(): void {
    this.origin!.setY(
      this.y - (this.first === this.last ? ANCESTRY_DISTANCE : LITTLE_GROUP_DISTANCE_CALC) - this.origin!.height,
    )
  }

  moveDescending(shift: number): void {
    if (!this.mini) {
      this.updateX()
      this.setX(this.x + shift)
      for (const node of this.list) {
        if (node.youth) node.youth.moveDescending(shift)
      }
    }
  }

  centerRelX(): number {
    return this.first!.centerX() - this.x + (this.last!.centerX() - this.first!.centerX()) / 2
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

  updateX(): void {
    this.x = this.list[0].x
  }

  getWidth(): number {
    const lastChild = this.list[this.list.length - 1]
    this.width = lastChild.x + lastChild.width - this.x
    return this.width
  }

  private getBasicLeftWidth(): number {
    let w = 0
    for (const node of this.list) {
      if (node.getPersonNodes().includes(this.first!)) {
        w += node.getLeftWidth(this.branch)
        break
      }
      w += node.width + HORIZONTAL_SPACE
    }
    return w
  }

  private getBasicCentralWidth(): number {
    let w = 0
    if (this.first && this.first !== this.last) {
      const start = this.first.getFamilyNode()
      const end = this.last!.getFamilyNode()
      for (let i = this.list.indexOf(start); i < this.list.indexOf(end); i++) {
        w += this.list[i].width + HORIZONTAL_SPACE
      }
      w = w - start.getLeftWidth(this.branch) + end.getLeftWidth(this.branch)
    }
    return w
  }

  getHeight(): number {
    this.height = 0
    for (const node of this.list) {
      this.height = Math.max(this.height, node.height)
    }
    return this.height
  }

  toString(): string {
    return String(this.list)
  }
}
