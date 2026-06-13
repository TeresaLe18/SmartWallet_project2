-- AlterTable
ALTER TABLE `user_kycs` ADD COLUMN `message` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `pin_failed_attempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `pin_hash` VARCHAR(191) NULL,
    ADD COLUMN `pin_locked_until` DATETIME(3) NULL;
