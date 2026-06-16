/*
  Warnings:

  - The values [BANNED] on the enum `users_status` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `news_posts` MODIFY `tag` VARCHAR(191) NOT NULL DEFAULT 'Economic',
    MODIFY `time` VARCHAR(191) NOT NULL DEFAULT 'Just published';

-- AlterTable
ALTER TABLE `users` MODIFY `status` ENUM('ACTIVE', 'LOCKED', 'DISABLED') NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE `wallets` ADD COLUMN `freeze_reason` ENUM('ACCOUNT_DISABLED', 'ACCOUNT_LOCKED', 'USER_REQUEST', 'ADMIN_REQUEST') NULL;
