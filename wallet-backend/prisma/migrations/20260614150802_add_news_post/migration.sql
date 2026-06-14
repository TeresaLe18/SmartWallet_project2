/*
  Warnings:

  - You are about to alter the column `amount` on the `ledger_entries` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(19,2)`.
  - You are about to alter the column `balance_before` on the `ledger_entries` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(19,2)`.
  - You are about to alter the column `balance_after` on the `ledger_entries` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(19,2)`.
  - You are about to alter the column `fee_value` on the `transaction_fee_rules` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(19,2)`.
  - You are about to alter the column `amount` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(19,2)`.
  - You are about to alter the column `fee_amount` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(19,2)`.
  - You are about to alter the column `discount_amount` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(19,2)`.
  - You are about to alter the column `final_amount` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(19,2)`.
  - You are about to alter the column `discount_value` on the `vouchers` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(19,2)`.
  - You are about to alter the column `min_transaction_amount` on the `vouchers` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(19,2)`.
  - You are about to alter the column `balance` on the `wallets` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(19,2)`.
  - You are about to alter the column `locked_balance` on the `wallets` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(19,2)`.

*/
-- AlterTable
ALTER TABLE `ledger_entries` MODIFY `amount` DECIMAL(19, 2) NOT NULL,
    MODIFY `balance_before` DECIMAL(19, 2) NOT NULL,
    MODIFY `balance_after` DECIMAL(19, 2) NOT NULL;

-- AlterTable
ALTER TABLE `transaction_fee_rules` MODIFY `fee_value` DECIMAL(19, 2) NOT NULL;

-- AlterTable
ALTER TABLE `transactions` MODIFY `amount` DECIMAL(19, 2) NOT NULL,
    MODIFY `fee_amount` DECIMAL(19, 2) NOT NULL DEFAULT 0,
    MODIFY `discount_amount` DECIMAL(19, 2) NOT NULL DEFAULT 0,
    MODIFY `final_amount` DECIMAL(19, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `vouchers` MODIFY `discount_value` DECIMAL(19, 2) NOT NULL,
    MODIFY `min_transaction_amount` DECIMAL(19, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `wallets` MODIFY `balance` DECIMAL(19, 2) NOT NULL DEFAULT 0,
    MODIFY `locked_balance` DECIMAL(19, 2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `news_posts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `tag` VARCHAR(191) NOT NULL DEFAULT 'Kinh tế',
    `time` VARCHAR(191) NOT NULL DEFAULT 'Vừa xong',
    `image` LONGTEXT NULL,
    `link` VARCHAR(191) NULL,
    `content` LONGTEXT NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
