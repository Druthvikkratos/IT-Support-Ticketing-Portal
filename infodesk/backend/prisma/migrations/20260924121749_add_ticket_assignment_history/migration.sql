-- CreateTable
CREATE TABLE `ticket_assignment_history` (
    `id` VARCHAR(191) NOT NULL,
    `ticket_id` VARCHAR(191) NOT NULL,
    `fromAdminId` VARCHAR(191) NULL,
    `toAdminId` VARCHAR(191) NOT NULL,
    `changed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ticket_assignment_history` ADD CONSTRAINT `ticket_assignment_history_ticket_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_assignment_history` ADD CONSTRAINT `ticket_assignment_history_fromAdminId_fkey` FOREIGN KEY (`fromAdminId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_assignment_history` ADD CONSTRAINT `ticket_assignment_history_toAdminId_fkey` FOREIGN KEY (`toAdminId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
