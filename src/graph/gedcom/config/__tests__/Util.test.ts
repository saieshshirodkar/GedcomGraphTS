import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { Card, Match, Branch, Side, Gender } from '../Util'
import { MPerson, MFact } from '../../__tests__/test-helper'

describe('Util enums and constants', () => {
  it('Card enum values are numeric and sequential', () => {
    assert.equal(Card.FULCRUM, 0)
    assert.equal(Card.REGULAR, 1)
    assert.equal(Card.ANCESTRY, 2)
    assert.equal(Card.PROGENY, 3)
  })

  it('Card enum has 4 unique members', () => {
    const values = Object.values(Card).filter(v => typeof v === 'number')
    assert.equal(new Set(values).size, 4)
  })

  it('Match enum values are numeric and sequential', () => {
    assert.equal(Match.MAIN, 0)
    assert.equal(Match.NEAR, 1)
    assert.equal(Match.MIDDLE, 2)
    assert.equal(Match.FAR, 3)
  })

  it('Match.get on LEFT with straight=false: last = MAIN, first = FAR', () => {
    assert.equal(Match.get(3, 2, Side.LEFT, false), Match.MAIN, 'last of 3 is MAIN')
    assert.equal(Match.get(3, 0, Side.LEFT, false), Match.FAR, 'first of 3 is FAR')
    assert.equal(Match.get(3, 1, Side.LEFT, false), Match.MIDDLE, 'middle of 3 is MIDDLE')
  })

  it('Match.get on LEFT with straight=true: second-to-last = NEAR', () => {
    assert.equal(Match.get(3, 1, Side.LEFT, true), Match.NEAR, 'second-to-last of 3 is NEAR')
    assert.equal(Match.get(2, 0, Side.LEFT, true), Match.NEAR, 'first of 2 is NEAR (since secondToLast=0)')
  })

  it('Match.get on RIGHT with straight=false: first = MAIN, last = FAR', () => {
    assert.equal(Match.get(3, 0, Side.RIGHT, false), Match.MAIN, 'first of 3 is MAIN')
    assert.equal(Match.get(3, 2, Side.RIGHT, false), Match.FAR, 'last of 3 is FAR')
    assert.equal(Match.get(3, 1, Side.RIGHT, false), Match.MIDDLE, 'middle of 3 is MIDDLE')
  })

  it('Match.get on RIGHT with straight=true: second = NEAR', () => {
    assert.equal(Match.get(3, 1, Side.RIGHT, true), Match.NEAR, 'second of 3 is NEAR')
    assert.equal(Match.get(2, 1, Side.RIGHT, true), Match.NEAR, 'second of 2 is NEAR')
  })

  it('Match.get returns MAIN for single marriage', () => {
    assert.equal(Match.get(1, 0, Side.NONE, false), Match.MAIN)
  })

  it('Match.getForAncestors: LEFT side, last index = NEAR, first = FAR', () => {
    assert.equal(Match.getForAncestors(4, 3, Side.LEFT), Match.NEAR, 'LEFT last of 4 is NEAR')
    assert.equal(Match.getForAncestors(4, 0, Side.LEFT), Match.FAR, 'LEFT first of 4 is FAR')
  })

  it('Match.getForAncestors: RIGHT side, first = NEAR, last = FAR', () => {
    assert.equal(Match.getForAncestors(4, 0, Side.RIGHT), Match.NEAR, 'RIGHT first of 4 is NEAR')
    assert.equal(Match.getForAncestors(4, 3, Side.RIGHT), Match.FAR, 'RIGHT last of 4 is FAR')
  })

  it('Match.getForAncestors returns MIDDLE for middle indices', () => {
    assert.equal(Match.getForAncestors(4, 1, Side.LEFT), Match.MIDDLE)
    assert.equal(Match.getForAncestors(4, 2, Side.LEFT), Match.MIDDLE)
  })

  it('Branch enum values are numeric and sequential', () => {
    assert.equal(Branch.NONE, 0)
    assert.equal(Branch.PATER, 1)
    assert.equal(Branch.MATER, 2)
  })

  it('Side enum values are numeric and sequential', () => {
    assert.equal(Side.NONE, 0)
    assert.equal(Side.LEFT, 1)
    assert.equal(Side.RIGHT, 2)
  })

  it('Gender enum values are numeric and sequential', () => {
    assert.equal(Gender.NONE, 0)
    assert.equal(Gender.MALE, 1)
    assert.equal(Gender.FEMALE, 2)
    assert.equal(Gender.UNDEFINED, 3)
    assert.equal(Gender.OTHER, 4)
  })

  it('Gender.getGender returns MALE for SEX M', () => {
    const p = new MPerson('Male /A/', [new MFact('SEX', 'M')])
    assert.equal(Gender.getGender(p), Gender.MALE)
  })

  it('Gender.getGender returns FEMALE for SEX F', () => {
    const p = new MPerson('Female /A/', [new MFact('SEX', 'F')])
    assert.equal(Gender.getGender(p), Gender.FEMALE)
  })

  it('Gender.getGender returns NONE for no SEX tag', () => {
    const p = new MPerson('NoSex /A/', [])
    assert.equal(Gender.getGender(p), Gender.NONE)
  })

  it('Gender.getGender returns UNDEFINED for SEX U', () => {
    const p = new MPerson('Undef /A/', [new MFact('SEX', 'U')])
    assert.equal(Gender.getGender(p), Gender.UNDEFINED)
  })

  it('Gender.getGender returns OTHER for unknown value', () => {
    const p = new MPerson('Other /A/', [new MFact('SEX', 'X')])
    assert.equal(Gender.getGender(p), Gender.OTHER)
  })

  it('Gender.isMale returns true only for SEX M', () => {
    const male = new MPerson('Male /B/', [new MFact('SEX', 'M')])
    const female = new MPerson('Female /B/', [new MFact('SEX', 'F')])
    assert.equal(Gender.isMale(male), true)
    assert.equal(Gender.isMale(female), false)
  })

  it('Gender.isFemale returns true only for SEX F', () => {
    const male = new MPerson('Male /C/', [new MFact('SEX', 'M')])
    const female = new MPerson('Female /C/', [new MFact('SEX', 'F')])
    assert.equal(Gender.isFemale(female), true)
    assert.equal(Gender.isFemale(male), false)
  })

  it('spacing constants are positive numbers', () => {
    const {
      VERTICAL_SPACE,
      HORIZONTAL_SPACE,
      UNION_DISTANCE,
      BOND_WIDTH,
      MINI_BOND_WIDTH,
      ANCESTRY_DISTANCE,
      PROGENY_DISTANCE,
      PROGENY_PLAY,
    } = require('../Util')
    assert.ok(VERTICAL_SPACE > 0)
    assert.ok(HORIZONTAL_SPACE > 0)
    assert.ok(UNION_DISTANCE > 0)
    assert.ok(BOND_WIDTH > 0)
    assert.ok(MINI_BOND_WIDTH > 0)
    assert.ok(ANCESTRY_DISTANCE > 0)
    assert.ok(PROGENY_DISTANCE > 0)
    assert.ok(PROGENY_PLAY > 0)
  })

  it('essence returns display value for person with name', () => {
    const { essence } = require('../Util')
    const p = new MPerson('John /Smith/')
    assert.equal(essence(p), 'John Smith')
  })

  it('essence returns [No name] for null', () => {
    const { essence } = require('../Util')
    assert.equal(essence(null), '[No name]')
  })

  it('essence handles person with empty name', () => {
    const { essence } = require('../Util')
    const p = new MPerson('')
    assert.equal(essence(p), '[No name]')
  })
})
