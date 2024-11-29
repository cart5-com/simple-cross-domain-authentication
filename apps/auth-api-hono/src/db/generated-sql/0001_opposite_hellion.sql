ALTER TABLE `user` ADD `two_factor_auth_key` blob;--> statement-breakpoint
ALTER TABLE `user` ADD `two_factor_auth_recovery_code` blob;