export type AppRole =
  | 'admin'
  | 'board-member'
  | 'ceo'
  | 'risk-officer'
  | 'audit-officer'
  | 'dept-head'

export type UserStatus = 'pending' | 'approved' | 'suspended'

export type InstitutionType = 'ministry' | 'department' | 'agency' | 'soe'

// JWT app_metadata shape (injected by custom_access_token_hook)
export interface AppMetadata {
  institution_id: string   // UUID as string
  dept_id: string          // UUID as string
  active_role: AppRole | ''
  roles: AppRole[]
  status: UserStatus
}

// Role descriptions for UI display (hardcoded per UI-SPEC Screen 2)
export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  'admin': 'Full administrative access and user management',
  'board-member': 'Board governance, meetings, and resolutions',
  'ceo': 'Executive oversight and strategic performance',
  'risk-officer': 'Risk register and treatment management',
  'audit-officer': 'Audit findings and compliance review',
  'dept-head': 'Departmental performance and compliance',
}

// Roles that require MFA (used in middleware and UI conditional rendering)
export const MFA_REQUIRED_ROLES: AppRole[] = ['admin', 'board-member']
