-- Ensure message content can store long LLM responses.
-- Supports both case-sensitive (Message) and case-insensitive/lowercase (message) table naming.
SET @message_table := (
  SELECT TABLE_NAME
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME IN ('Message', 'message')
  ORDER BY (TABLE_NAME = 'Message') DESC
  LIMIT 1
);

SET @sql := COALESCE(
  (
    SELECT CONCAT(
      'ALTER TABLE `',
      @message_table,
      '` MODIFY `content` MEDIUMTEXT NOT NULL'
    )
  ),
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
