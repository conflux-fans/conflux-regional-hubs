CREATE TABLE `regional_content` (
	`region` text PRIMARY KEY NOT NULL,
	`content_json` text NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `regional_modules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`region` text NOT NULL,
	`module_key` text NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`position` integer NOT NULL,
	`title` text NOT NULL,
	`subtitle` text NOT NULL,
	`source` text NOT NULL,
	`layout` text DEFAULT 'grid' NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `regional_modules_region_key_unique` ON `regional_modules` (`region`,`module_key`);--> statement-breakpoint
CREATE INDEX `regional_modules_region_position_idx` ON `regional_modules` (`region`,`position`);