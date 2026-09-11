-- AlterTable
ALTER TABLE `form_fields` ADD COLUMN `file_config` JSON NULL,
    MODIFY `field_type` ENUM('text', 'textarea', 'number', 'date', 'dropdown', 'radio', 'checkbox', 'phone', 'email', 'file') NOT NULL;
