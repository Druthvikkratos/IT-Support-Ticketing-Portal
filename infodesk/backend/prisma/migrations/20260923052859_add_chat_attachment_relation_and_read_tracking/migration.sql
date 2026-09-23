/*
  Warnings:

  - You are about to drop the column `attachement_path` on the `ticket_messages` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `ticket_messages` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `ticket_messages` DROP COLUMN `attachement_path`,
    DROP COLUMN `createdAt`,
    ADD COLUMN `attachmentId` VARCHAR(191) NULL,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateTable
CREATE TABLE `ticket_message_reads` (
    `id` VARCHAR(191) NOT NULL,
    `ticket_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `last_read_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ticket_message_reads_ticket_id_user_id_key`(`ticket_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ticket_messages` ADD CONSTRAINT `ticket_messages_attachmentId_fkey` FOREIGN KEY (`attachmentId`) REFERENCES `ticket_attachements`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_message_reads` ADD CONSTRAINT `ticket_message_reads_ticket_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_message_reads` ADD CONSTRAINT `ticket_message_reads_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
