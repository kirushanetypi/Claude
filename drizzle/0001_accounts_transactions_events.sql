CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`balance` integer NOT NULL,
	`interest_rate` text,
	`interest_payout_day` integer,
	`credit_card_settings` text,
	`loan_settings` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `accounts_user_idx` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `accounts_user_type_idx` ON `accounts` (`user_id`,`type`);--> statement-breakpoint
CREATE TABLE `event_facts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`event_id` text NOT NULL,
	`month_key` text NOT NULL,
	`actual_amount` integer NOT NULL,
	`actual_date` integer NOT NULL,
	`status` text NOT NULL,
	`transaction_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_id`) REFERENCES `scheduled_events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_facts_event_month_uq` ON `event_facts` (`event_id`,`month_key`);--> statement-breakpoint
CREATE INDEX `event_facts_user_month_idx` ON `event_facts` (`user_id`,`month_key`);--> statement-breakpoint
CREATE TABLE `scheduled_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`base_amount` integer NOT NULL,
	`transaction_type` text NOT NULL,
	`account_id` text NOT NULL,
	`to_account_id` text,
	`category` text,
	`recurrence` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`auto_generated` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `events_user_idx` ON `scheduled_events` (`user_id`);--> statement-breakpoint
CREATE INDEX `events_user_account_idx` ON `scheduled_events` (`user_id`,`account_id`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`date` integer NOT NULL,
	`title` text NOT NULL,
	`category` text,
	`note` text,
	`account_id` text,
	`from_account_id` text,
	`to_account_id` text,
	`scheduled_event_id` text,
	`principal_part` integer,
	`interest_part` integer,
	`extra_payment` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`scheduled_event_id`) REFERENCES `scheduled_events`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `tx_user_date_idx` ON `transactions` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `tx_user_account_idx` ON `transactions` (`user_id`,`account_id`);--> statement-breakpoint
CREATE INDEX `tx_user_from_idx` ON `transactions` (`user_id`,`from_account_id`);--> statement-breakpoint
CREATE INDEX `tx_user_to_idx` ON `transactions` (`user_id`,`to_account_id`);--> statement-breakpoint
CREATE INDEX `tx_event_idx` ON `transactions` (`scheduled_event_id`);