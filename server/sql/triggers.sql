DROP TRIGGER IF EXISTS trg_student_response_before_insert;
DROP TRIGGER IF EXISTS trg_student_response_after_insert;
DROP TRIGGER IF EXISTS set_default_status;

DELIMITER $$

CREATE TRIGGER trg_student_response_before_insert
BEFORE INSERT ON STUDENT_RESPONSE
FOR EACH ROW
BEGIN
    DECLARE v_correct_option_id INT;

    SELECT o.option_id
    INTO v_correct_option_id
    FROM OPTIONS o
    WHERE o.question_id = NEW.question_id
      AND o.is_correct = 1
    LIMIT 1;

    IF v_correct_option_id IS NOT NULL AND NEW.selected_option_id = v_correct_option_id THEN
        SET NEW.is_correct = 1;
    ELSE
        SET NEW.is_correct = 0;
    END IF;
END$$

CREATE TRIGGER trg_student_response_after_insert
AFTER INSERT ON STUDENT_RESPONSE
FOR EACH ROW
BEGIN
    DECLARE v_total_score DECIMAL(10,2) DEFAULT 0;

    SELECT COALESCE(SUM(q.marks), 0)
    INTO v_total_score
    FROM STUDENT_RESPONSE sr
    INNER JOIN QUESTION q ON q.question_id = sr.question_id
    WHERE sr.attempt_id = NEW.attempt_id
      AND sr.is_correct = 1;

    UPDATE TEST_ATTEMPT ta
    SET ta.score = v_total_score
    WHERE ta.attempt_id = NEW.attempt_id;
END$$

  CREATE TRIGGER set_default_status
  BEFORE INSERT ON REPORT
  FOR EACH ROW
  BEGIN
    SET NEW.status = 'pending';
  END$$

DELIMITER ;

-- Example: source this file in MySQL client
-- SOURCE server/sql/triggers.sql;

-- Optional: ensure REPORT has report_type when migrating old schema
-- ALTER TABLE REPORT ADD COLUMN IF NOT EXISTS report_type ENUM('bug', 'complaint', 'issue', 'feedback') NOT NULL DEFAULT 'issue' AFTER role;
