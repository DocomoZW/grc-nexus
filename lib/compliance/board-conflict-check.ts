// lib/compliance/board-conflict-check.ts
// Real-time chair-CEO conflict detection utilities
// Used by UI hooks, API routes, and the compliance engine

import type { BoardMember } from './pecg-types'

export interface ChairCEOConflictResult {
  hasConflict: boolean
  conflictType: 'same_person' | 'chair_is_executive' | 'chair_not_independent' | 'missing_chair' | 'missing_ceo' | 'multiple_chairs' | 'multiple_ceos' | null
  severity: 'critical' | 'warning' | 'info' | null
  message: string
  chair: BoardMember | null
  ceo: BoardMember | null
  violations: string[]
}

/**
 * Detect chair-CEO conflicts in a board member list
 * PECG Act Section 8: Chair must be independent non-executive
 * ZimCode Principle 2.1: Chair cannot be CEO
 */
export function checkChairCEOConflict(boardMembers: BoardMember[]): ChairCEOConflictResult {
  const result: ChairCEOConflictResult = {
    hasConflict: false,
    conflictType: null,
    severity: null,
    message: '',
    chair: null,
    ceo: null,
    violations: [],
  }

  if (!boardMembers || boardMembers.length === 0) {
    result.message = 'No board members found'
    result.severity = 'info'
    return result
  }

  // Find all chairs and CEOs
  const chairs = boardMembers.filter((m) => m.isChair || m.role === 'chair')
  const ceos = boardMembers.filter((m) => m.isCEO || m.role === 'ceo')

  result.chair = chairs[0] || null
  result.ceo = ceos[0] || null

  // 1. Missing chair
  if (chairs.length === 0) {
    result.violations.push('No chairperson designated')
    result.hasConflict = true
    result.conflictType = 'missing_chair'
    result.severity = 'critical'
  }

  // 2. Missing CEO
  if (ceos.length === 0) {
    result.violations.push('No CEO designated')
    if (!result.hasConflict) {
      result.conflictType = 'missing_ceo'
      result.severity = 'warning'
    }
  }

  // 3. Multiple chairs
  if (chairs.length > 1) {
    result.violations.push(`Multiple chairpersons found (${chairs.length})`)
    result.hasConflict = true
    result.conflictType = 'multiple_chairs'
    result.severity = 'critical'
  }

  // 4. Multiple CEOs
  if (ceos.length > 1) {
    result.violations.push(`Multiple CEOs found (${ceos.length})`)
    result.hasConflict = true
    result.conflictType = 'multiple_ceos'
    result.severity = 'critical'
  }

  // 5. Same person is both chair and CEO
  if (result.chair && result.ceo && result.chair.id === result.ceo.id) {
    result.violations.push(
      `Chairperson ${result.chair.firstName} ${result.chair.lastName} is also CEO — same person holding both roles (PECG Act Section 8)`
    )
    result.hasConflict = true
    result.conflictType = 'same_person'
    result.severity = 'critical'
  }

  // 6. Chair is executive (but not CEO)
  if (result.chair && result.chair.isExecutive && !result.chair.isCEO) {
    result.violations.push(
      `Chairperson ${result.chair.firstName} ${result.chair.lastName} is an executive director (should be non-executive)`
    )
    result.hasConflict = true
    result.conflictType = 'chair_is_executive'
    result.severity = 'critical'
  }

  // 7. Chair is not independent
  if (result.chair && !result.chair.isIndependent) {
    result.violations.push(
      `Chairperson ${result.chair.firstName} ${result.chair.lastName} is not classified as independent (PECG Act Section 8)`
    )
    result.hasConflict = true
    result.conflictType = 'chair_not_independent'
    result.severity = 'critical'
  }

  // Build final message
  if (result.violations.length === 0) {
    result.message = result.chair
      ? `Chairperson ${result.chair.firstName} ${result.chair.lastName} is independent and not CEO. Compliant.`
      : 'Board composition requires review.'
    result.severity = 'info'
  } else {
    result.message = result.violations.join('; ')
  }

  return result
}

/**
 * Validate board composition against PECG Act requirements
 */
export interface BoardCompositionValidation {
  isValid: boolean
  issues: string[]
  stats: {
    totalMembers: number
    femaleCount: number
    femaleRatio: number
    civilServantCount: number
    civilServantRatio: number
    independentCount: number
    independentRatio: number
    executiveCount: number
    executiveRatio: number
    hasChair: boolean
    hasCEO: boolean
  }
}

export function validateBoardComposition(
  boardMembers: BoardMember[],
  options?: {
    minFemaleRatio?: number
    maxCivilServantRatio?: number
    minIndependentRatio?: number
  }
): BoardCompositionValidation {
  const minFemaleRatio = options?.minFemaleRatio ?? 0.30
  const maxCivilServantRatio = options?.maxCivilServantRatio ?? 0.49
  const minIndependentRatio = options?.minIndependentRatio ?? 0.50

  const issues: string[] = []
  const total = boardMembers.length

  if (total === 0) {
    return { isValid: false, issues: ['No board members found'], stats: { totalMembers: 0, femaleCount: 0, femaleRatio: 0, civilServantCount: 0, civilServantRatio: 0, independentCount: 0, independentRatio: 0, executiveCount: 0, executiveRatio: 0, hasChair: false, hasCEO: false } }
  }

  const femaleCount = boardMembers.filter((m) => m.gender === 'female').length
  const civilServantCount = boardMembers.filter((m) => m.isCivilServant).length
  const independentCount = boardMembers.filter((m) => m.isIndependent).length
  const executiveCount = boardMembers.filter((m) => m.isExecutive).length
  const hasChair = boardMembers.some((m) => m.isChair || m.role === 'chair')
  const hasCEO = boardMembers.some((m) => m.isCEO || m.role === 'ceo')

  const femaleRatio = femaleCount / total
  const civilServantRatio = civilServantCount / total
  const independentRatio = independentCount / total
  const executiveRatio = executiveCount / total

  if (femaleRatio < minFemaleRatio) {
    issues.push(`Female representation ${Math.round(femaleRatio * 100)}% below minimum ${Math.round(minFemaleRatio * 100)}%`)
  }

  if (civilServantRatio > maxCivilServantRatio) {
    issues.push(`Civil servant ratio ${Math.round(civilServantRatio * 100)}% exceeds maximum ${Math.round(maxCivilServantRatio * 100)}%`)
  }

  if (independentRatio < minIndependentRatio) {
    issues.push(`Independent director ratio ${Math.round(independentRatio * 100)}% below minimum ${Math.round(minIndependentRatio * 100)}%`)
  }

  if (!hasChair) {
    issues.push('No chairperson designated')
  }

  if (!hasCEO) {
    issues.push('No CEO designated')
  }

  // Check for permanent secretaries (prohibited)
  const permSecs = boardMembers.filter((m) => m.role === 'permanent_secretary')
  if (permSecs.length > 0) {
    issues.push(`Permanent Secretaries found on board (${permSecs.length}) — prohibited by PECG Act`)
  }

  return {
    isValid: issues.length === 0,
    issues,
    stats: {
      totalMembers: total,
      femaleCount,
      femaleRatio,
      civilServantCount,
      civilServantRatio,
      independentCount,
      independentRatio,
      executiveCount,
      executiveRatio,
      hasChair,
      hasCEO,
    },
  }
}

/**
 * Check if a board member appointment would create a conflict
 * Use before inserting/updating board_members
 */
export function wouldCreateConflict(
  existingMembers: BoardMember[],
  newMember: Partial<BoardMember>
): { wouldConflict: boolean; reason: string | null } {
  // Check chair-CEO conflict
  if (newMember.isChair && newMember.isCEO) {
    return { wouldConflict: true, reason: 'Same person cannot be both chair and CEO' }
  }

  if (newMember.isChair) {
    const existingCEO = existingMembers.find((m) => m.isCEO || m.role === 'ceo')
    if (existingCEO && newMember.id === existingCEO.id) {
      return { wouldConflict: true, reason: 'Cannot appoint chair who is already CEO' }
    }
  }

  if (newMember.isCEO) {
    const existingChair = existingMembers.find((m) => m.isChair || m.role === 'chair')
    if (existingChair && newMember.id === existingChair.id) {
      return { wouldConflict: true, reason: 'Cannot appoint CEO who is already chair' }
    }
  }

  // Check multiple chairs
  if (newMember.isChair) {
    const existingChairs = existingMembers.filter((m) => m.isChair || m.role === 'chair')
    if (existingChairs.length > 0) {
      return { wouldConflict: true, reason: `Board already has a chair (${existingChairs[0].firstName} ${existingChairs[0].lastName})` }
    }
  }

  // Check multiple CEOs
  if (newMember.isCEO) {
    const existingCEOs = existingMembers.filter((m) => m.isCEO || m.role === 'ceo')
    if (existingCEOs.length > 0) {
      return { wouldConflict: true, reason: `Board already has a CEO (${existingCEOs[0].firstName} ${existingCEOs[0].lastName})` }
    }
  }

  return { wouldConflict: false, reason: null }
}
