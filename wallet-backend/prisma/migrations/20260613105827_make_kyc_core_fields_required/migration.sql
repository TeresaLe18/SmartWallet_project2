/*
  Warnings:

  - Made the column `national_id` on table `user_kycs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `full_name` on table `user_kycs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `date_of_birth` on table `user_kycs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `front_image` on table `user_kycs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `back_image` on table `user_kycs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `selfie_image` on table `user_kycs` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `user_kycs` MODIFY `national_id` VARCHAR(191) NOT NULL,
    MODIFY `full_name` VARCHAR(191) NOT NULL,
    MODIFY `date_of_birth` DATETIME(3) NOT NULL,
    MODIFY `front_image` VARCHAR(191) NOT NULL,
    MODIFY `back_image` VARCHAR(191) NOT NULL,
    MODIFY `selfie_image` VARCHAR(191) NOT NULL;
