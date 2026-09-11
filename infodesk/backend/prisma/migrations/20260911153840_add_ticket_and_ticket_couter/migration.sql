-- CreateTable
CREATE TABLE `tickets` (
    `id` VARCHAR(191) NOT NULL,
    `ticket_number` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `issueTypeId` INTEGER NOT NULL,
    `priority` ENUM('low', 'medium', 'high') NOT NULL,
    `status` ENUM('raised', 'pending', 'in_progress', 'solved', 'closed') NOT NULL DEFAULT 'raised',
    `phone_number` VARCHAR(191) NOT NULL,
    `custom_field_values` JSON NULL,
    `raisedById` VARCHAR(191) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `closed_at` DATETIME(3) NULL,

    UNIQUE INDEX `tickets_ticket_number_key`(`ticket_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_counter` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `lastNumber` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_issueTypeId_fkey` FOREIGN KEY (`issueTypeId`) REFERENCES `issue_type`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_raisedById_fkey` FOREIGN KEY (`raisedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
