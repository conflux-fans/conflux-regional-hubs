CREATE TABLE `regional_contributors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`region` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`short_bio` text NOT NULL,
	`full_bio` text NOT NULL,
	`photo_url` text DEFAULT '' NOT NULL,
	`display_order` integer NOT NULL,
	`is_visible` integer DEFAULT true NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `regional_contributors_region_order_idx` ON `regional_contributors` (`region`,`display_order`);