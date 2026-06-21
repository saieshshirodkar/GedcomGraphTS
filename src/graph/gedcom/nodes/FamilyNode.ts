import type { Family } from '../model/types'
import { Bond } from './Bond'
import { Node } from '../core/Node'
import type { PersonNode } from './PersonNode'
import { Branch, Side, Match, MINI_BOND_WIDTH, MARRIAGE_INNER_WIDTH, BOND_WIDTH } from '../config/Util'

export class FamilyNode extends Node {
  partners: PersonNode[] = []
  bond: Bond | null = null
  side: Side
  leftToRight: boolean

  constructor(
    public spouseFamily: Family,
    mini: boolean,
    side: Side,
    leftToRight: boolean,
  ) {
    super()
    this.mini = mini
    this.side = side
    this.leftToRight = leftToRight
    this.partners = []
  }

  getOrigin(): Node | null {
    const mainPerson = this.getMainPersonNode()
    return mainPerson ? mainPerson.origin : null
  }

  getOrigins(): Node[] {
    const origins: Node[] = []
    for (const partner of this.partners) {
      if (partner.origin && !partner.origin.mini && partner.origin.getPersonNodes().length > 0)
        origins.push(partner.origin)
    }
    return origins
  }

  isDuplicate(): boolean {
    return this.partners.some(p => p.duplicate)
  }

  getFamilyNode(): Node {
    return this
  }

  getPersonNodes(): PersonNode[] {
    return this.partners
  }

  getMainPersonNode(): PersonNode | null {
    return this.partners.find(p => !p.acquired) ?? null
  }

  getHusband(): PersonNode | null {
    return this.partners[0] ?? null
  }

  getWife(): PersonNode | null {
    return this.partners.length > 1 ? this.partners[1] : (this.partners[0] ?? null)
  }

  getPartner(id: number): PersonNode | null {
    return this.partners[id] ?? null
  }

  addPartner(partner: PersonNode): void {
    this.partners.push(partner)
    partner.familyNode = this
    partner.spouseFamily = this.spouseFamily
  }

  createBond(): void {
    if (this.partners.length === 1 && this.match === Match.MAIN) return
    this.bond = new Bond(this)
    if (!this.mini && this.partners.length > 0) {
      for (const ef of this.spouseFamily.getEventsFacts()) {
        if (ef.getTag() === 'MARR') this.bond.marriageDate = ef.getDate()
      }
    }
  }

  hasChildren(): boolean {
    if (this.mini) return true
    return this.youth !== null
  }

  centerRelX(): number {
    if (this.partners.length === 0 || this.side === Side.RIGHT) return this.bond!.width / 2
    else if (this.partners.length > 1 || this.side === Side.LEFT)
      return this.partners[0].width + this.getBondWidth() / 2
    else return this.partners[0].width / 2
  }

  centerRelY(): number {
    return this.height / 2
  }

  simpleCenterX(): number {
    if (this.bond) {
      return this.bond.x + this.bond.width / 2
    }
    return this.x + this.width / 2
  }

  setX(x: number): void {
    this.force += x - this.x
    this.x = x
    if (this.partners.length === 0) {
      this.bond!.setX(x)
    } else if (this.side === Side.RIGHT) {
      this.bond!.x = x
      this.partners[0].x = x + this.bond!.width - this.bond!.overlap
    } else {
      for (let i = 0; i < this.partners.length; i++) {
        const partner = this.partners[i]
        partner.x = x
        if (i === 0) {
          x += partner.width
          if (this.bond) {
            this.bond.setX(x)
            x += this.getBondWidth()
          }
        }
      }
    }
  }

  setY(y: number): void {
    this.y = y
    for (const partner of this.partners) {
      partner.setY(this.centerY() - partner.centerRelY())
    }
    if (this.bond) this.bond.y = y
  }

  getLeftWidth(branch: Branch): number {
    if ((branch === Branch.MATER || this.partners.indexOf(this.getMainPersonNode()!) > 0) && this.partners.length > 1) {
      return this.getPartner(0)!.width + this.getBondWidth() + this.getPartner(1)!.centerRelX()
    } else if (this.partners.length > 0) {
      return this.getPartner(0)!.centerRelX()
    }
    return 0
  }

  getBondWidth(): number {
    if (this.bond) return this.mini ? MINI_BOND_WIDTH : this.bond.marriageDate ? MARRIAGE_INNER_WIDTH : BOND_WIDTH
    return 0
  }

  toString(): string {
    const parts = this.partners.map(p => String(p))
    return '{' + parts.join(', ') + '}'
  }
}
