-- AlterTable
ALTER TABLE `tickets` ADD COLUMN `assignedAdminId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_assignedAdminId_fkey` FOREIGN KEY (`assignedAdminId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
