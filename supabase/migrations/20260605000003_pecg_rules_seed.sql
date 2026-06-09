-- Migration: 20260605000003_pecg_rules_seed.sql
-- Seed PECG Act and ZimCode compliance rules into the engine
-- These rules are the codified version of the regulatory requirements

-- ============================================================
-- BOARD COMPOSITION RULES (PECG Act Section 11)
-- ============================================================

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('TERM_LIMIT', 'Board Member Term Limit', 'PECG_ACT', 'Section 11', 'Board members serve a maximum of 4 years, renewable once (max 8 years total). Appointments beyond this limit are invalid.', 'deadline', '{"maxTermYears": 4, "maxRenewals": 1, "maxTotalYears": 8}', 'critical');

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('MEMBERSHIP_LIMIT', 'Board Membership Limit', 'PECG_ACT', 'Section 11', 'A person cannot serve on more than three boards of public entities total. Cross-board appointments must be monitored.', 'count', '{"maxBoards": 3}', 'critical');

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('GENDER_REPRESENTATION', 'Gender Representation', 'PECG_ACT', 'Section 11', 'Board appointments must ensure equal gender representation (minimum 30% female and 30% male) and fair regional representation.', 'ratio', '{"minFemaleRatio": 0.30, "minMaleRatio": 0.30}', 'warning');

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('CIVIL_SERVANT_RESTRICTION', 'Civil Servant Board Restriction', 'PECG_ACT', 'Section 11', 'Permanent Secretaries are prohibited from being board members. Other civil servants cannot form a majority on any board.', 'ratio', '{"maxCivilServantRatio": 0.49, "prohibitedRoles": ["permanent_secretary"]}', 'critical');

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('DATABASE_INCLUSION', 'Board Member Database Inclusion', 'PECG_ACT', 'Section 6', 'All board appointees must be included in the CGU national database of qualified candidates. Appointments outside the database are invalid.', 'presence', '{"requiredInDatabase": true}', 'critical');

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('CHAIR_INDEPENDENCE', 'Chairperson Independence', 'ZIMCODE', 'Principle 4', 'The Chairperson must be an independent non-executive director and cannot simultaneously hold the position of CEO.', 'presence', '{"chairMustBeIndependent": true, "chairCannotBeCEO": true}', 'critical');

-- ============================================================
-- MEETING RULES (PECG Act Section 33, ZimCode)
-- ============================================================

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('QUARTERLY_MEETINGS', 'Quarterly Board Meetings', 'PECG_ACT', 'Section 33', 'Boards must meet at least once every three months (minimum 4 meetings per year). No gap between meetings should exceed 92 days.', 'count', '{"minMeetingsPerYear": 4, "maxGapDays": 92}', 'critical');

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('AGM_REQUIRED', 'Annual General Meeting', 'PECG_ACT', 'Section 33', 'An Annual General Meeting must be held with representatives from CGU, the line Ministry, and the Accountant-General present.', 'presence', '{"requiredAttendees": ["cgu_representative", "line_ministry", "accountant_general"], "minAttendees": 3}', 'warning');

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('CONFLICT_DISCLOSURE', 'Conflict of Interest Disclosure', 'PECG_ACT', 'Section 34', 'Board members and senior staff must immediately disclose any direct or indirect pecuniary interests and recuse themselves from related discussions and voting.', 'presence', '{"requiredPerMeeting": true, "recusalRequired": true}', 'critical');

-- ============================================================
-- PERFORMANCE MANAGEMENT RULES (PECG Act Sections 22-25)
-- ============================================================

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('STRATEGIC_PLAN', 'Strategic Plan Submission', 'PECG_ACT', 'Section 22', 'Boards must draw up a strategic plan for 2-6 years and submit to line Minister, CGU, and Minister of Finance within 6 months of appointment.', 'deadline', '{"maxPlanYears": 6, "minPlanYears": 2, "submitToMinister": true, "submitToCGU": true, "submitToFinance": true, "deadlineMonths": 6}', 'warning');

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('PERFORMANCE_CONTRACT_BOARD', 'Board Member Performance Contract', 'PECG_ACT', 'Section 25', 'Board members must enter into written performance contracts with the line Minister within 2 months of appointment. Failure results in immediate cessation of membership.', 'deadline', '{"deadlineDays": 60, "contractWith": "line_minister", "required": true}', 'critical');

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('PERFORMANCE_CONTRACT_CEO', 'CEO Performance Contract', 'PECG_ACT', 'Section 23', 'CEO and senior staff must enter into performance contracts with the board before assuming office.', 'deadline', '{"deadlineEvent": "before_assuming_office", "contractWith": "board", "required": true}', 'critical');

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('ANNUAL_REVIEW', 'Annual Performance Review', 'PECG_ACT', 'Section 24', 'Boards must annually review compliance with strategic plans and performance contracts and report results to the line Minister.', 'deadline', '{"frequency": "annual", "submitToMinister": true}', 'warning');

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('DIRECTOR_DEVELOPMENT', 'Director Development', 'ZIMCODE', 'Principle 4', 'The board must provide schemes for ongoing director development and education.', 'presence', '{"required": true, "annualTrainingHours": 20}', 'warning');

-- ============================================================
-- GOVERNANCE RULES (PECG Act Sections 26-27, ZimCode)
-- ============================================================

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('BOARD_CHARTER', 'Board Charter', 'PECG_ACT', 'Section 26', 'Every board must prepare a board charter incorporating vision, mission, values, risk assessment policies, and succession plans. Reviewed annually.', 'presence', '{"requiredElements": ["vision", "mission", "values", "risk_assessment", "succession_plan"], "reviewFrequency": "annual"}', 'warning');

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('CODE_OF_ETHICS', 'Code of Ethics', 'PECG_ACT', 'Section 26', 'Every CEO must prepare a code of ethics incorporating professional ethics, efficiency, and transparency principles. Reviewed annually.', 'presence', '{"requiredElements": ["professional_ethics", "efficiency", "transparency"], "preparedBy": "ceo", "reviewFrequency": "annual"}', 'warning');

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('ASSET_DECLARATION', 'Asset Declaration', 'PECG_ACT', 'Section 37', 'Board members and senior staff must declare assets (immovable property, business interests, items over $100,000) within 3 months of appointment and annually thereafter.', 'deadline', '{"initialDeadlineDays": 90, "frequency": "annual", "requiredElements": ["immovable_property", "business_interests", "high_value_items"], "highValueThreshold": 100000}', 'critical');

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('RISK_COMMITTEE', 'Risk Management Committee', 'ZIMCODE', 'Principle 5', 'The board must appoint a Risk Management Committee with clearly defined functions and responsibilities.', 'presence', '{"required": true, "definedFunctions": true}', 'warning');

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('WHISTLEBLOWING_SYSTEM', 'Whistleblowing System', 'ZIMCODE', 'Principle 5', 'The board must establish an efficient and reliable whistleblowing system to detect and guard against corporate misdemeanors.', 'presence', '{"required": true, "anonymousReporting": true}', 'warning');

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('BOARD_SELF_ASSESSMENT', 'Board Self-Assessment', 'ZIMCODE', 'Principle 4', 'The board must implement mechanisms for regularly assessing its own performance, including the performance of the Chairperson.', 'deadline', '{"frequency": "annual", "includeChairAssessment": true}', 'warning');

-- ============================================================
-- FINANCIAL & REMUNERATION RULES (PECG Act Sections 12-14, 19-20)
-- ============================================================

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('PAY_CAP', 'Remuneration Cap', 'PECG_ACT', 'Section 20', 'Remuneration for all employees including the CEO should generally not exceed 30% of the entity''s revenue or operational budget for the previous year.', 'threshold', '{"maxRatio": 0.30, "appliesTo": "all_employees_including_ceo"}', 'critical');

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('STANDARDIZED_ALLOWANCES', 'Standardized Allowances', 'PECG_ACT', 'Section 12', 'The Minister formulates standard sitting allowances and service conditions. Boards must observe these and may only depart with written approval from the President.', 'presence', '{"ministerFormulated": true, "presidentialApprovalRequired": true}', 'warning');

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('PROHIBITED_LOANS', 'Prohibited Loans to Board Members', 'PECG_ACT', 'Section 14', 'Public entities are prohibited from extending loans or credit to board members or their associates. This is a criminal offense.', 'absence', '{"prohibitedRecipients": ["board_members", "associates"], "criminalOffense": true}', 'critical');

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('ANNUAL_AUDIT', 'Annual Audit', 'PECG_ACT', 'Section 36', 'Accounts must be audited annually by the Auditor-General or a registered public auditor.', 'deadline', '{"frequency": "annual", "auditor": "auditor_general_or_public_auditor", "required": true}', 'warning');

-- ============================================================
-- ZIMCODE DISCLOSURE & TRANSPARENCY RULES
-- ============================================================

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('BENEFICIAL_OWNERSHIP', 'Beneficial Ownership Disclosure', 'ZIMCODE', 'Principle 6', 'Nominee shareholders must disclose the beneficial owners of shares upon request by relevant authorities.', 'presence', '{"required": true, "disclosureChannel": "financial_statements"}', 'warning');

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('ANTI_SELECTIVE_DISCLOSURE', 'Anti-Selective Disclosure', 'ZIMCODE', 'Principle 6', 'The board is prohibited from engaging in selective corporate disclosure. All stakeholders must receive equal information.', 'absence', '{"prohibitedPractice": "selective_disclosure"}', 'warning');

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('INTEGRATED_REPORTING', 'Integrated Reporting System', 'ZIMCODE', 'Principle 7', 'Entities must implement an integrated reporting system (including ICT) that is holistic and governed by proper disclosure channels.', 'presence', '{"required": true, "ictIntegration": true}', 'warning');

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('RISK_TOLERANCE', 'Risk Tolerance Levels', 'ZIMCODE', 'Principle 5', 'The board must formally determine and establish levels of the company''s risk tolerance.', 'presence', '{"required": true, "documented": true}', 'warning');

-- ============================================================
-- ZIMCODE STAKEHOLDER RIGHTS RULES
-- ============================================================

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('VOTING_MECHANISMS', 'Fair Voting Mechanisms', 'ZIMCODE', 'Principle 3', 'Entities must implement clear, simple, and fair voting rules including proxy voting, no voting caps, and protection of minority rights.', 'presence', '{"proxyVoting": true, "noVotingCaps": true, "minorityProtection": true}', 'warning');

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('EMPLOYEE_SHARE_SCHEMES', 'Employee Share Ownership', 'ZIMCODE', 'Principle 3', 'Companies must establish employee share ownership schemes to ensure employees benefit from company growth.', 'presence', '{"required": true}', 'info');

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('COMMUNITY_BENEFIT', 'Community Benefit', 'ZIMCODE', 'Principle 3', 'Local communities must benefit from company activities through employment, infrastructure, or social programs.', 'presence', '{"required": true, "csrProgram": true}', 'info');

insert into public.pecg_compliance_rules (rule_code, rule_name, regulation, section_ref, description, check_type, check_config, severity) values
('ADR_AVAILABILITY', 'Alternative Dispute Resolution', 'ZIMCODE', 'Principle 3', 'Entities are encouraged to use ADR methods for resolving corporate and stakeholder conflicts.', 'presence', '{"required": true, "adrPolicy": true}', 'info');
