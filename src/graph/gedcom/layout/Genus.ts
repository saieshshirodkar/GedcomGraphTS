import type { Person } from '../model/types'
import type { Node } from '../core/Node'

export class Genus extends Array<Node> {
  contains(person: Person): boolean {
    for (const node of this) {
      for (const personNode of node.getPersonNodes()) {
        if (personNode.person.getId() === person.getId()) {
          return true
        }
      }
    }
    return false
  }

  toString(): string {
    const parts: string[] = []
    for (const node of this) {
      parts.push(String(node))
    }
    return '[' + parts.join(' - ') + ']'
  }
}
