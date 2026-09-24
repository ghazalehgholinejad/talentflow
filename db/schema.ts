import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const createdAt = () => text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`);
const updatedAt = () => text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`);

export const candidates = sqliteTable("candidates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  legacyId: text("legacy_id"),
  fullName: text("full_name").notNull(),
  normalizedEmail: text("normalized_email"),
  normalizedPhone: text("normalized_phone"),
  email: text("email"),
  phone: text("phone"),
  city: text("city"),
  currentTitle: text("current_title"),
  yearsExperience: real("years_experience").notNull().default(0),
  skillsJson: text("skills_json").notNull().default("[]"),
  profileSummary: text("profile_summary").notNull().default(""),
  extractionConfidence: real("extraction_confidence").notNull().default(0),
  reviewStatus: text("review_status").notNull().default("needs_review"),
  missingFieldsJson: text("missing_fields_json").notNull().default("[]"),
  source: text("source").notNull().default("manual"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("uq_candidates_legacy_id").on(table.legacyId),
  uniqueIndex("uq_candidates_normalized_email").on(table.normalizedEmail),
  uniqueIndex("uq_candidates_normalized_phone").on(table.normalizedPhone),
  index("idx_candidates_review_status").on(table.reviewStatus),
]);

export const resumeDocuments = sqliteTable("resume_documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  candidateId: integer("candidate_id").notNull().references(() => candidates.id),
  providerFileId: text("provider_file_id"),
  sourceUrl: text("source_url"),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull().default("application/pdf"),
  objectKey: text("object_key"),
  checksum: text("checksum"),
  version: integer("version").notNull().default(1),
  rawText: text("raw_text").notNull().default(""),
  parsingStatus: text("parsing_status").notNull().default("queued"),
  createdAt: createdAt(),
}, (table) => [
  uniqueIndex("uq_resume_provider_file").on(table.providerFileId),
  index("idx_resumes_candidate").on(table.candidateId),
  index("idx_resumes_parsing_status").on(table.parsingStatus),
]);

export const jobs = sqliteTable("jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  legacyId: text("legacy_id"),
  title: text("title").notNull(),
  department: text("department").notNull(),
  location: text("location").notNull().default("تهران"),
  employmentType: text("employment_type").notNull().default("تمام‌وقت"),
  status: text("status").notNull().default("draft"),
  headcount: integer("headcount").notNull().default(1),
  minExperience: real("min_experience").notNull().default(0),
  mustHaveSkillsJson: text("must_have_skills_json").notNull().default("[]"),
  niceToHaveSkillsJson: text("nice_to_have_skills_json").notNull().default("[]"),
  description: text("description").notNull().default(""),
  evaluationRubricJson: text("evaluation_rubric_json").notNull().default("[]"),
  companyDataJson: text("company_data_json").notNull().default("{}"),
  extractedCriteriaJson: text("extracted_criteria_json").notNull().default("{}"),
  resumeRejectThreshold: real("resume_reject_threshold").notNull().default(50),
  resumeReviewThreshold: real("resume_review_threshold").notNull().default(70),
  resumePassThreshold: real("resume_pass_threshold").notNull().default(80),
  interviewPassThreshold: real("interview_pass_threshold").notNull().default(70),
  createdBy: text("created_by"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("uq_jobs_legacy_id").on(table.legacyId),
  index("idx_jobs_status").on(table.status),
]);

export const screeningRuns = sqliteTable("screening_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobId: integer("job_id").notNull().references(() => jobs.id),
  requestedCount: integer("requested_count").notNull(),
  minimumScore: real("minimum_score").notNull(),
  filtersJson: text("filters_json").notNull().default("{}"),
  selectedCount: integer("selected_count").notNull().default(0),
  createdBy: text("created_by"),
  createdAt: createdAt(),
}, (table) => [index("idx_screening_job").on(table.jobId)]);

export const applications = sqliteTable("applications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobId: integer("job_id").notNull().references(() => jobs.id),
  candidateId: integer("candidate_id").notNull().references(() => candidates.id),
  screeningRunId: integer("screening_run_id").references(() => screeningRuns.id),
  stage: text("stage").notNull().default("suggested"),
  status: text("status").notNull().default("suggested"),
  resumeScore: real("resume_score").notNull().default(0),
  resumeDecision: text("resume_decision"),
  resumeConfidence: real("resume_confidence"),
  resumeSummary: text("resume_summary"),
  aiReasonsJson: text("ai_reasons_json").notNull().default("[]"),
  riskFlagsJson: text("risk_flags_json").notNull().default("[]"),
  hrDecisionReason: text("hr_decision_reason"),
  decidedBy: text("decided_by"),
  decidedAt: text("decided_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("uq_application_job_candidate").on(table.jobId, table.candidateId),
  index("idx_applications_job_status").on(table.jobId, table.status),
  index("idx_applications_candidate").on(table.candidateId),
]);

export const interviewSessions = sqliteTable("interview_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  applicationId: integer("application_id").notNull().references(() => applications.id),
  round: integer("round").notNull().default(1),
  status: text("status").notNull().default("draft"),
  accessTokenHash: text("access_token_hash"),
  expiresAt: text("expires_at"),
  startedAt: text("started_at"),
  submittedAt: text("submitted_at"),
  overallScore: real("overall_score"),
  recommendation: text("recommendation"),
  confidence: real("confidence"),
  roleAlignment: real("role_alignment"),
  communication: real("communication"),
  motivation: real("motivation"),
  resumeConsistency: real("resume_consistency"),
  behavioralFit: real("behavioral_fit"),
  reportJson: text("report_json"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("uq_interview_application_round").on(table.applicationId, table.round),
  index("idx_interview_status").on(table.status),
]);

export const interviewQuestions = sqliteTable("interview_questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  interviewId: integer("interview_id").notNull().references(() => interviewSessions.id),
  sequence: integer("sequence").notNull(),
  competency: text("competency").notNull(),
  questionText: text("question_text").notNull(),
  expectedSignalsJson: text("expected_signals_json").notNull().default("[]"),
  maxScore: real("max_score").notNull().default(10),
  audioObjectKey: text("audio_object_key"),
}, (table) => [uniqueIndex("uq_interview_question_sequence").on(table.interviewId, table.sequence)]);

export const interviewAnswers = sqliteTable("interview_answers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  questionId: integer("question_id").notNull().references(() => interviewQuestions.id),
  answerText: text("answer_text").notNull().default(""),
  audioObjectKey: text("audio_object_key"),
  durationSeconds: integer("duration_seconds"),
  score: real("score"),
  evidenceJson: text("evidence_json").notNull().default("[]"),
  aiFeedback: text("ai_feedback"),
  createdAt: createdAt(),
}, (table) => [uniqueIndex("uq_answer_question").on(table.questionId)]);

export const interviewTurns = sqliteTable("interview_turns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  interviewId: integer("interview_id").notNull().references(() => interviewSessions.id),
  questionId: integer("question_id").references(() => interviewQuestions.id),
  turnIndex: integer("turn_index").notNull(),
  role: text("role").notNull(),
  text: text("text").notNull().default(""),
  audioObjectKey: text("audio_object_key"),
  intent: text("intent"),
  createdAt: createdAt(),
}, (table) => [
  uniqueIndex("uq_interview_turn_index").on(table.interviewId, table.turnIndex),
  index("idx_interview_turn_question").on(table.questionId),
]);

export const outboundMessages = sqliteTable("outbound_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  applicationId: integer("application_id").references(() => applications.id),
  channel: text("channel").notNull().default("email"),
  recipient: text("recipient").notNull(),
  template: text("template").notNull(),
  status: text("status").notNull().default("queued"),
  providerMessageId: text("provider_message_id"),
  error: text("error"),
  createdAt: createdAt(),
  sentAt: text("sent_at"),
}, (table) => [index("idx_messages_status").on(table.status)]);

export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  metadataJson: text("metadata_json").notNull().default("{}"),
  createdAt: createdAt(),
}, (table) => [index("idx_audit_entity").on(table.entityType, table.entityId)]);

export const reviewTasks = sqliteTable("review_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reviewType: text("review_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  status: text("status").notNull().default("open"),
  requiredFieldsJson: text("required_fields_json").notNull().default("[]"),
  fieldCorrectionsJson: text("field_corrections_json").notNull().default("{}"),
  assignedTo: text("assigned_to"),
  decision: text("decision"),
  notes: text("notes"),
  createdAt: createdAt(),
  completedAt: text("completed_at"),
}, (table) => [
  index("idx_review_tasks_status_type").on(table.status, table.reviewType),
  index("idx_review_tasks_entity").on(table.entityType, table.entityId),
]);

export const processingJobs = sqliteTable("processing_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  idempotencyKey: text("idempotency_key").notNull(),
  kind: text("kind").notNull(),
  status: text("status").notNull().default("queued"),
  payloadHash: text("payload_hash"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("uq_processing_idempotency_key").on(table.idempotencyKey),
  index("idx_processing_status_kind").on(table.status, table.kind),
]);
