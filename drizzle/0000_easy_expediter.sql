CREATE TABLE `articles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`region` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`excerpt` text NOT NULL,
	`body` text NOT NULL,
	`author_email` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`published_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `articles_region_slug_unique` ON `articles` (`region`,`slug`);--> statement-breakpoint
CREATE INDEX `articles_region_published_idx` ON `articles` (`region`,`published_at`);--> statement-breakpoint
CREATE TABLE `region_settings` (
	`region` text PRIMARY KEY NOT NULL,
	`wordmark` text NOT NULL,
	`domain` text NOT NULL,
	`headline` text NOT NULL,
	`intro` text NOT NULL,
	`accent` text NOT NULL,
	`secondary` text NOT NULL,
	`layout` text NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` integer NOT NULL
);
