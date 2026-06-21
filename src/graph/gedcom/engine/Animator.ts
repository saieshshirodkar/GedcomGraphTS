import type { Node } from '../core/Node'
import type { PersonNode } from '../nodes/PersonNode'
import type { Bond } from '../nodes/Bond'
import { Line } from '../core/Line'
import type { DuplicateLine } from '../lines/DuplicateLine'
import { Group } from '../layout/Group'
import { GroupRow } from '../layout/GroupRow'
import { UnionRow } from '../layout/UnionRow'
import { Union } from '../layout/Union'
import { FamilyNode } from '../nodes/FamilyNode'
import {
  MINI_BOND_WIDTH,
  MARRIAGE_WIDTH,
  MARRIAGE_INNER_WIDTH,
  BOND_WIDTH,
  VERTICAL_SPACE_CALC,
  PROGENY_DISTANCE,
} from '../config/Util'
import { CurveLine } from '../lines/CurveLine'
import { NextLine } from '../lines/NextLine'
import { HorizontalLine } from '../lines/HorizontalLine'
import { BackLine } from '../lines/BackLine'
import { VerticalLine } from '../lines/VerticalLine'
import { Match, Side } from '../config/Util'

export class Animator {
  width = 0
  height = 0
  fulcrumGroup!: Group
  maxAbove = 0
  nodes: Node[] = []
  personNodes: PersonNode[] = []
  bonds: Bond[] = []
  lines: Line[] = []
  lineRows: LineRow[] = []
  lineGroups: Set<Line>[] = []
  backLines: Line[] = []
  backLineRows: LineRow[] = []
  backLineGroups: Set<Line>[] = []
  duplicateLines: DuplicateLine[] = []
  groups: Group[] = []
  groupRows: GroupRow[] = []
  unionRows: UnionRow[] = []
  leftToRight = false
  maxBitmapSize = 0
  biggestPathSize = 0

  addNode(newNode: Node): void {
    this.nodes.push(newNode)
    this.personNodes.push(...newNode.getPersonNodes())
  }

  initNodes(fulcrumGroup: Group, maxAbove: number, maxBelow: number, withNumbers: boolean): void {
    this.fulcrumGroup = fulcrumGroup
    this.maxAbove = maxAbove
    this.width = 0
    this.height = 0
    this.biggestPathSize = 0

    const totalRows = maxAbove + 1 + maxBelow
    const rowMaxHeight: number[] = new Array(totalRows).fill(0)

    for (const node of this.nodes) {
      if (node instanceof FamilyNode) {
        const familyNode = node as FamilyNode
        for (const partner of familyNode.partners) {
          familyNode.width += partner.width
          familyNode.height = Math.max(familyNode.height, partner.height)
        }
        if (familyNode.height === 0) familyNode.height = 20
        const bond = familyNode.bond
        if (bond) {
          bond.width = familyNode.mini ? MINI_BOND_WIDTH : bond.marriageDate ? MARRIAGE_WIDTH : BOND_WIDTH
          bond.height = familyNode.height
          if (bond.marriageDate) {
            bond.overlap = (MARRIAGE_WIDTH - MARRIAGE_INNER_WIDTH) / 2
            if (familyNode.side === Side.LEFT || familyNode.side === Side.RIGHT) familyNode.width += bond.overlap
          }
          this.bonds.push(bond)
          familyNode.width += familyNode.getBondWidth()
        }
      }
      if (!node.mini && node.getPersonNodes().length > 0 && node.height > rowMaxHeight[node.generation + maxAbove])
        rowMaxHeight[node.generation + maxAbove] = node.height
    }

    this.unionRows = []
    this.groupRows = []
    let posY = rowMaxHeight[0] / 2
    for (let gen = -maxAbove; gen < totalRows - maxAbove; gen++) {
      this.unionRows.push(new UnionRow(gen, posY))
      this.groupRows.push(new GroupRow(gen))
      if (gen + maxAbove < totalRows - 1)
        posY += rowMaxHeight[gen + maxAbove] / 2 + VERTICAL_SPACE_CALC + rowMaxHeight[gen + maxAbove + 1] / 2
    }

    for (const group of this.groups) {
      group.setOrigin()
    }

    if (!withNumbers) {
      for (const personNode of this.personNodes) {
        const origin = personNode.origin
        if (origin && origin.mini && origin.youth && origin.youth.list.length === 1) {
          personNode.origin = null
          const idx = this.nodes.indexOf(origin)
          if (idx >= 0) this.nodes.splice(idx, 1)
          const bondIdx = this.bonds.indexOf((origin as FamilyNode).bond!)
          if (bondIdx >= 0) this.bonds.splice(bondIdx, 1)
        }
      }
    }

    this.lines = []
    this.backLines = []
    for (const node of this.nodes) {
      for (const personNode of node.getPersonNodes()) {
        if (personNode.getOrigin()) {
          this.lines.push(new CurveLine(personNode))
        }
      }
      if (node instanceof FamilyNode) {
        const familyNode = node as FamilyNode
        if (familyNode.partners.length > 0 && familyNode.match !== Match.MAIN) this.lines.push(new NextLine(familyNode))
        else if (familyNode.partners.length > 1) this.lines.push(new HorizontalLine(familyNode))
        if (familyNode.match === Match.NEAR) this.lines.push(new BackLine(familyNode))
        else if (familyNode.match === Match.MIDDLE || familyNode.match === Match.FAR)
          this.backLines.push(new BackLine(familyNode))
        if (familyNode.hasChildren() && familyNode.bond) this.lines.push(new VerticalLine(familyNode))
      }
    }

    for (const group of this.groups) {
      if (!group.mini && group.list.length > 0) {
        if (group.generation < 0 && group.list.length === 1 && group.list[0].getPersonNodes().length === 0) continue
        this.groupRows[group.generation + maxAbove].push(group)
      }
    }

    for (const row of this.groupRows) {
      let previous: Node | null = null
      for (const group of row) {
        for (const node of group.list) {
          if (node !== previous) {
            node.prev = previous
            if (node.prev) node.prev.next = node
            previous = node
          }
        }
      }
    }

    for (const groupRow of this.groupRows) {
      for (const group of groupRow) {
        const row = this.unionRows[group.generation + maxAbove]
        let union: Union | null = null
        let joinExistingGroup = false
        for (const node of group.list) {
          if (node.isAncestor) {
            for (const un of row) {
              if (node === un.ancestor) {
                union = un
                joinExistingGroup = true
                break
              }
            }
            if (!union) {
              union = new Union(node.generation)
              union.ancestor = node
            }
            break
          }
        }
        if (!union) union = new Union(group.generation)
        if (joinExistingGroup) {
          for (const node of group.list) {
            if (node !== union.ancestor) {
              union.list.push(node)
            }
          }
        } else {
          union.list.push(...group.list)
          row.addUnion(union)
        }
        for (const node of union.list) {
          node.union = union
          const main = node.getMainPersonNode()
          if (main && main.isFulcrumNode()) union.ancestor = node
        }
      }
    }

    for (const unionRow of this.unionRows) {
      unionRow.findCentralNode()
      let previous: Union | null = null
      for (const union of unionRow) {
        union.prev = previous
        if (union.prev) union.prev.next = union
        previous = union
        union.initializeDescendants()
        union.initializeYouths()
      }
    }

    for (const node of this.nodes) {
      node.initializeOrigins()
    }
  }

  placeNodes(): void {
    for (const row of this.unionRows) {
      for (const union of row) {
        union.y = row.yAxe - union.centerRelY()
        for (const node of union.list) {
          node.setY(row.yAxe - node.centerRelY())
        }
      }
    }

    for (const group of this.groups) {
      if (!group.mini && group.isOriginMiniOrEmpty()) {
        group.y = this.unionRows[group.generation + this.maxAbove].yAxe - group.centerRelY()
        group.placeOriginY()
      }
      for (const node of group.list) {
        node.placeAcquiredOriginY()
        const youth = node.youth
        if (youth && youth.mini) youth.setY(node.y + node.height + PROGENY_DISTANCE)
      }
    }

    this.fulcrumGroup.placeNodes(0)
    for (let r = this.maxAbove; r >= 0; r--) {
      this.groupRows[r].placeAncestors()
    }
    for (let r = Math.max(0, this.maxAbove - 1); r < this.unionRows.length; r++) {
      this.unionRows[r].placeYouths()
    }
    for (let r = this.maxAbove - 1; r >= 0; r--) {
      this.unionRows[r].placeOriginsAscending()
    }

    let count = 100
    let forces = Number.MAX_VALUE
    while (count > 0 && Math.abs(forces) > 1) {
      for (const node of this.nodes) node.force = 0
      for (let r = this.maxAbove - 1; r >= 0; r--) {
        this.unionRows[r].outdistanceAncestorColumns()
      }
      for (let r = this.maxAbove - 2; r >= 0; r--) {
        for (const union of this.unionRows[r]) {
          union.setX(union.x + union.alignBetweenOrigins())
        }
      }
      for (let r = Math.max(0, this.maxAbove - 1); r < this.unionRows.length; r++) {
        this.unionRows[r].outdistanceDescendantColumns()
      }
      forces = 0
      for (const node of this.nodes) forces += node.force
      count--
    }

    for (const unionRow of this.unionRows) unionRow.resolveOverlap()

    if (this.maxAbove > 0 && this.unionRows[this.maxAbove - 1].length > 0) {
      const parentUnion = this.unionRows[this.maxAbove - 1][0]
      parentUnion.moveDescending(parentUnion.alignBetweenOrigins())
    }

    for (const node of this.nodes) {
      node.alignMiniEmptyOverYouth()
      node.placeAcquiredOriginX()
      node.placeMiniChildrenX()
    }

    let minX = Number.MAX_VALUE,
      minY = Number.MAX_VALUE
    let maxX = -Number.MAX_VALUE,
      maxY = -Number.MAX_VALUE
    for (const node of this.nodes) {
      if (node.x < minX) minX = node.x
      if (node.x + node.width > maxX) maxX = node.x + node.width
      if (node.y < minY) minY = node.y
      if (node.y + node.height > maxY) maxY = node.y + node.height
    }
    this.width = maxX - minX
    this.height = maxY - minY

    for (const node of this.nodes) {
      node.setX(node.x - minX)
      node.setY(node.y - minY)
    }

    if (!this.leftToRight) {
      for (const node of this.nodes) {
        if (node instanceof FamilyNode) node.x = this.width - node.x - node.width
      }
      for (const node of this.personNodes) node.x = this.width - node.x - node.width
      for (const bond of this.bonds) bond.x = this.width - bond.x - bond.width
    }

    for (const line of this.duplicateLines) line.update()
    this.distributeLines(this.lines, this.lineRows, this.lineGroups)
    this.distributeLines(this.backLines, this.backLineRows, this.backLineGroups)
  }

  private distributeLines(lines: Line[], lineRows: LineRow[], lineGroups: Set<Line>[]): void {
    if (this.maxBitmapSize === 0) return
    for (const line of lines) line.update()
    lines.sort((a, b) => a.compareTo(b))
    for (const row of lineRows) row.reset()
    for (const line of lines) {
      const rowNum = Math.floor(line.y2 / this.maxBitmapSize)
      while (rowNum >= lineRows.length) lineRows.push(new LineRow())
      const row = lineRows[rowNum]
      const lineLeft = Math.min(line.x1, line.x2)
      if (row.length === 0 || lineLeft > row.restartX + this.maxBitmapSize) {
        row.restartX = lineLeft
        row.push(new Set<Line>())
      }
      row[row.length - 1].add(line)
      const pathWidth = Math.max(line.x1, line.x2) - row.restartX
      if (pathWidth > this.biggestPathSize) this.biggestPathSize = pathWidth
    }
    lineGroups.length = 0
    for (const row of lineRows) {
      for (const group of row) {
        if (group.size > 0) lineGroups.push(group)
      }
    }
  }
}

class LineRow extends Array<Set<Line>> {
  restartX = 0

  reset(): void {
    this.restartX = 0
    for (const group of this) group.clear()
  }
}
