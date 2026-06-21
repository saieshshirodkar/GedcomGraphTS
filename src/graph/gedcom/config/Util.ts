import type { Person } from '../model/types'

export enum Card {
  FULCRUM,
  REGULAR,
  ANCESTRY,
  PROGENY,
}

export enum Match {
  MAIN,
  NEAR,
  MIDDLE,
  FAR,
}

export enum Branch {
  NONE,
  PATER,
  MATER,
}

export enum Side {
  NONE,
  LEFT,
  RIGHT,
}

export enum Gender {
  NONE,
  MALE,
  FEMALE,
  UNDEFINED,
  OTHER,
}

export namespace Match {
  export function get(totFamilies: number, index: number, side: Side, straight: boolean): Match {
    if (side === Side.RIGHT) {
      if (index === 0) return Match.MAIN
      if (index === 1 && straight) return Match.NEAR
      if (index === totFamilies - 1) return Match.FAR
    } else {
      if (index === totFamilies - 1) return Match.MAIN
      if (index === totFamilies - 2 && straight) return Match.NEAR
      if (index === 0) return Match.FAR
    }
    return Match.MIDDLE
  }

  export function getForAncestors(totFamilies: number, index: number, side: Side): Match {
    if ((side === Side.LEFT && index === totFamilies - 1) || (side === Side.RIGHT && index === 0)) return Match.NEAR
    if ((side === Side.LEFT && index === 0) || (side === Side.RIGHT && index === totFamilies - 1)) return Match.FAR
    return Match.MIDDLE
  }
}

export namespace Gender {
  export function getGender(person: Person): Gender {
    for (const fact of person.getEventsFacts()) {
      if (fact.getTag() === 'SEX' && fact.getValue() != null) {
        switch (fact.getValue()) {
          case 'M':
            return Gender.MALE
          case 'F':
            return Gender.FEMALE
          case 'U':
            return Gender.UNDEFINED
          default:
            return Gender.OTHER
        }
      }
    }
    return Gender.NONE
  }

  export function isMale(person: Person): boolean {
    return getGender(person) === Gender.MALE
  }

  export function isFemale(person: Person): boolean {
    return getGender(person) === Gender.FEMALE
  }
}

export const VERTICAL_SPACE = 90
export let VERTICAL_SPACE_CALC = 0
export function setVerticalSpaceCalc(v: number) {
  VERTICAL_SPACE_CALC = v
}
export const HORIZONTAL_SPACE = 15
export const UNION_DISTANCE = 35

export const BOND_WIDTH = 23
export const MINI_BOND_WIDTH = 18
export const MARRIAGE_WIDTH = 39
export const MARRIAGE_INNER_WIDTH = 25
export const MARRIAGE_HEIGHT = 25
export const HEARTH_DIAMETER = 8
export const MINI_HEARTH_DIAMETER = 6

export const LITTLE_GROUP_DISTANCE = 60
export let LITTLE_GROUP_DISTANCE_CALC = 0
export function setLittleGroupDistanceCalc(v: number) {
  LITTLE_GROUP_DISTANCE_CALC = v
}
export const ANCESTRY_DISTANCE = 16
export const PROGENY_DISTANCE = 16
export const PROGENY_PLAY = 12

export function essence(person: Person | null): string {
  if (!person) return '[No name]'
  const names = person.getNames()
  if (names.length > 0) {
    let str = names[0].getDisplayValue().replace(/\//g, '')
    str = str.trim()
    if (str) return str
  }
  return '[No name]'
}
