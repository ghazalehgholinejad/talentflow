CREATE TABLE `processing_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`idempotency_key` text NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`payload_hash` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_processing_idempotency_key` ON `processing_jobs` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `idx_processing_status_kind` ON `processing_jobs` (`status`,`kind`);--> statement-breakpoint
CREATE TABLE `review_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`review_type` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`required_fields_json` text DEFAULT '[]' NOT NULL,
	`field_corrections_json` text DEFAULT '{}' NOT NULL,
	`assigned_to` text,
	`decision` text,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_review_tasks_status_type` ON `review_tasks` (`status`,`review_type`);--> statement-breakpoint
CREATE INDEX `idx_review_tasks_entity` ON `review_tasks` (`entity_type`,`entity_id`);