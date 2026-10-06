/*
  Warnings:

  - A unique constraint covering the columns `[raisedById,clientRequestId]` on the table `tickets` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `ticket_messages` ADD COLUMN `kind` ENUM('text', 'bot', 'bot_actions') NOT NULL DEFAULT 'text';

-- AlterTable
ALTER TABLE `tickets` ADD COLUMN `botState` ENUM('none', 'awaiting_reply', 'resolved', 'escalated') NOT NULL DEFAULT 'none',
    ADD COLUMN `clientRequestId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `bot_guides` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `issueTypeId` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `steps` JSON NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bot_guides_issueTypeId_key`(`issueTypeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `app_settings` (
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `tickets_raisedById_clientRequestId_key` ON `tickets`(`raisedById`, `clientRequestId`);

-- AddForeignKey
ALTER TABLE `bot_guides` ADD CONSTRAINT `bot_guides_issueTypeId_fkey` FOREIGN KEY (`issueTypeId`) REFERENCES `issue_type`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
