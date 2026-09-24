CREATE TABLE `applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` integer NOT NULL,
	`candidate_id` integer NOT NULL,
	`screening_run_id` integer,
	`stage` text DEFAULT 'suggested' NOT NULL,
	`status` text DEFAULT 'suggested' NOT NULL,
	`resume_score` real DEFAULT 0 NOT NULL,
	`resume_decision` text,
	`resume_confidence` real,
	`resume_summary` text,
	`ai_reasons_json` text DEFAULT '[]' NOT NULL,
	`risk_flags_json` text DEFAULT '[]' NOT NULL,
	`hr_decision_reason` text,
	`decided_by` text,
	`decided_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`screening_run_id`) REFERENCES `screening_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_application_job_candidate` ON `applications` (`job_id`,`candidate_id`);--> statement-breakpoint
CREATE INDEX `idx_applications_job_status` ON `applications` (`job_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_applications_candidate` ON `applications` (`candidate_id`);--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_entity` ON `audit_log` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `candidates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`legacy_id` text,
	`full_name` text NOT NULL,
	`normalized_email` text,
	`normalized_phone` text,
	`email` text,
	`phone` text,
	`city` text,
	`current_title` text,
	`years_experience` real DEFAULT 0 NOT NULL,
	`skills_json` text DEFAULT '[]' NOT NULL,
	`profile_summary` text DEFAULT '' NOT NULL,
	`extraction_confidence` real DEFAULT 0 NOT NULL,
	`review_status` text DEFAULT 'needs_review' NOT NULL,
	`missing_fields_json` text DEFAULT '[]' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_candidates_legacy_id` ON `candidates` (`legacy_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_candidates_normalized_email` ON `candidates` (`normalized_email`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_candidates_normalized_phone` ON `candidates` (`normalized_phone`);--> statement-breakpoint
CREATE INDEX `idx_candidates_review_status` ON `candidates` (`review_status`);--> statement-breakpoint
CREATE TABLE `interview_answers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`question_id` integer NOT NULL,
	`answer_text` text DEFAULT '' NOT NULL,
	`audio_object_key` text,
	`duration_seconds` integer,
	`score` real,
	`evidence_json` text DEFAULT '[]' NOT NULL,
	`ai_feedback` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `interview_questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_answer_question` ON `interview_answers` (`question_id`);--> statement-breakpoint
CREATE TABLE `interview_questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`interview_id` integer NOT NULL,
	`sequence` integer NOT NULL,
	`competency` text NOT NULL,
	`question_text` text NOT NULL,
	`expected_signals_json` text DEFAULT '[]' NOT NULL,
	`max_score` real DEFAULT 10 NOT NULL,
	`audio_object_key` text,
	FOREIGN KEY (`interview_id`) REFERENCES `interview_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_interview_question_sequence` ON `interview_questions` (`interview_id`,`sequence`);--> statement-breakpoint
CREATE TABLE `interview_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`round` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`access_token_hash` text,
	`expires_at` text,
	`started_at` text,
	`submitted_at` text,
	`overall_score` real,
	`recommendation` text,
	`confidence` real,
	`role_alignment` real,
	`communication` real,
	`motivation` real,
	`resume_consistency` real,
	`behavioral_fit` real,
	`report_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_interview_application_round` ON `interview_sessions` (`application_id`,`round`);--> statement-breakpoint
CREATE INDEX `idx_interview_status` ON `interview_sessions` (`status`);--> statement-breakpoint
CREATE TABLE `interview_turns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`interview_id` integer NOT NULL,
	`question_id` integer,
	`turn_index` integer NOT NULL,
	`role` text NOT NULL,
	`text` text DEFAULT '' NOT NULL,
	`audio_object_key` text,
	`intent` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`interview_id`) REFERENCES `interview_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`question_id`) REFERENCES `interview_questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_interview_turn_index` ON `interview_turns` (`interview_id`,`turn_index`);--> statement-breakpoint
CREATE INDEX `idx_interview_turn_question` ON `interview_turns` (`question_id`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`legacy_id` text,
	`title` text NOT NULL,
	`department` text NOT NULL,
	`location` text DEFAULT 'تهران' NOT NULL,
	`employment_type` text DEFAULT 'تمام‌وقت' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`headcount` integer DEFAULT 1 NOT NULL,
	`min_experience` real DEFAULT 0 NOT NULL,
	`must_have_skills_json` text DEFAULT '[]' NOT NULL,
	`nice_to_have_skills_json` text DEFAULT '[]' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`evaluation_rubric_json` text DEFAULT '[]' NOT NULL,
	`company_data_json` text DEFAULT '{}' NOT NULL,
	`extracted_criteria_json` text DEFAULT '{}' NOT NULL,
	`resume_reject_threshold` real DEFAULT 50 NOT NULL,
	`resume_review_threshold` real DEFAULT 70 NOT NULL,
	`resume_pass_threshold` real DEFAULT 80 NOT NULL,
	`interview_pass_threshold` real DEFAULT 70 NOT NULL,
	`created_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_jobs_legacy_id` ON `jobs` (`legacy_id`);--> statement-breakpoint
CREATE INDEX `idx_jobs_status` ON `jobs` (`status`);--> statement-breakpoint
CREATE TABLE `outbound_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer,
	`channel` text DEFAULT 'email' NOT NULL,
	`recipient` text NOT NULL,
	`template` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`provider_message_id` text,
	`error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`sent_at` text,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_messages_status` ON `outbound_messages` (`status`);--> statement-breakpoint
CREATE TABLE `resume_documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`candidate_id` integer NOT NULL,
	`provider_file_id` text,
	`source_url` text,
	`file_name` text NOT NULL,
	`content_type` text DEFAULT 'application/pdf' NOT NULL,
	`object_key` text,
	`checksum` text,
	`version` integer DEFAULT 1 NOT NULL,
	`raw_text` text DEFAULT '' NOT NULL,
	`parsing_status` text DEFAULT 'queued' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_resume_provider_file` ON `resume_documents` (`provider_file_id`);--> statement-breakpoint
CREATE INDEX `idx_resumes_candidate` ON `resume_documents` (`candidate_id`);--> statement-breakpoint
CREATE INDEX `idx_resumes_parsing_status` ON `resume_documents` (`parsing_status`);--> statement-breakpoint
CREATE TABLE `screening_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` integer NOT NULL,
	`requested_count` integer NOT NULL,
	`minimum_score` real NOT NULL,
	`filters_json` text DEFAULT '{}' NOT NULL,
	`selected_count` integer DEFAULT 0 NOT NULL,
	`created_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_screening_job` ON `screening_runs` (`job_id`);