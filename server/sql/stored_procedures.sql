DROP PROCEDURE IF EXISTS GetStudentPerformance;
DROP PROCEDURE IF EXISTS GetLeaderboard;
DROP PROCEDURE IF EXISTS GetTestStats;

DELIMITER $$

CREATE PROCEDURE GetStudentPerformance(IN p_student_id INT)
BEGIN
    SELECT
        ta.attempt_id,
        ta.student_id,
        u.name AS student_name,
        t.test_id,
        t.title AS test_name,
        c.course_id,
        c.course_name,
        ta.score,
        ta.start_time,
        ta.end_time
    FROM TEST_ATTEMPT ta
    INNER JOIN USERS u ON u.user_id = ta.student_id
    INNER JOIN TEST t ON t.test_id = ta.test_id
    INNER JOIN COURSE c ON c.course_id = t.course_id
    WHERE ta.student_id = p_student_id
    ORDER BY ta.start_time DESC, ta.attempt_id DESC;
END$$

CREATE PROCEDURE GetLeaderboard(IN p_test_id INT)
BEGIN
    SELECT
        ta.test_id,
        t.title AS test_name,
        c.course_id,
        c.course_name,
        ta.student_id,
        u.name AS student_name,
        ta.score,
        ta.attempt_id,
        ta.end_time
    FROM TEST_ATTEMPT ta
    INNER JOIN USERS u ON u.user_id = ta.student_id
    INNER JOIN TEST t ON t.test_id = ta.test_id
    INNER JOIN COURSE c ON c.course_id = t.course_id
    WHERE ta.test_id = p_test_id
    ORDER BY ta.score DESC, ta.end_time ASC, ta.attempt_id ASC
    LIMIT 5;
END$$

CREATE PROCEDURE GetTestStats(IN p_test_id INT)
BEGIN
    SELECT
        ta.test_id,
        t.title AS test_name,
        c.course_id,
        c.course_name,
        COUNT(*) AS total_attempts,
        AVG(ta.score) AS avg_score,
        MAX(ta.score) AS max_score,
        MIN(ta.score) AS min_score
    FROM TEST_ATTEMPT ta
    INNER JOIN USERS u ON u.user_id = ta.student_id
    INNER JOIN TEST t ON t.test_id = ta.test_id
    INNER JOIN COURSE c ON c.course_id = t.course_id
    WHERE ta.test_id = p_test_id
    GROUP BY ta.test_id, t.title, c.course_id, c.course_name;
END$$

DELIMITER ;

-- Example calls:
-- CALL GetStudentPerformance(1);
-- CALL GetLeaderboard(1);
-- CALL GetTestStats(1);
