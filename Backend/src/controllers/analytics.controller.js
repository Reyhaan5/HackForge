const pool = require("../config/db");
const getAnalyticsSummary = async (req, res) => {
    try {
        const statsQuery = `
            SELECT
                (SELECT COUNT(*)::int FROM students) AS total_students,
                (SELECT COUNT(*)::int FROM users_auth WHERE role = 'Student') AS total_student_accounts,
                (SELECT COUNT(*)::int FROM chat_history) AS total_questions_asked,
                (SELECT COUNT(DISTINCT student_id)::int FROM chat_history WHERE student_id IS NOT NULL) AS active_students_count,
                (SELECT COUNT(*)::int FROM chat_history WHERE student_id IS NULL) AS guest_questions_count,
                (SELECT COUNT(*)::int FROM chat_history WHERE created_at >= NOW() - INTERVAL '24 HOURS') AS questions_last_24h,
                (SELECT COUNT(*)::int FROM chat_history WHERE created_at >= NOW() - INTERVAL '7 DAYS') AS questions_last_7d,
                (SELECT COUNT(*)::int FROM students WHERE callback_requested = TRUE) AS pending_callbacks_count,
                (SELECT COUNT(*)::int FROM chat_history WHERE needs_followup = TRUE) AS queries_needing_followup;
        `;

        const departmentBreakdownQuery = `
            SELECT 
                COALESCE(d.name, 'General / Inquiries') AS department_name,
                COUNT(c.chat_id)::int AS question_count
            FROM chat_history c
            LEFT JOIN departments d ON c.department_id = d.department_id
            GROUP BY d.name
            ORDER BY question_count DESC;
        `;

        const branchBreakdownQuery = `
            SELECT 
                COALESCE(target_branch, 'Undeclared') AS branch_name,
                COUNT(student_id)::int AS student_count
            FROM students
            WHERE target_branch IS NOT NULL AND target_branch != ''
            GROUP BY target_branch
            ORDER BY student_count DESC;
        `;

        const feedbackStatsQuery = `
            SELECT
                COUNT(*)::int AS total_feedback,
                COALESCE(ROUND(AVG(rating)::numeric, 2), 0) AS average_rating,
                COUNT(*) FILTER (WHERE rating >= 4)::int AS positive_feedback_count,
                COUNT(*) FILTER (WHERE rating = 5)::int AS count_5_star,
                COUNT(*) FILTER (WHERE rating = 4)::int AS count_4_star,
                COUNT(*) FILTER (WHERE rating = 3)::int AS count_3_star,
                COUNT(*) FILTER (WHERE rating = 2)::int AS count_2_star,
                COUNT(*) FILTER (WHERE rating = 1)::int AS count_1_star
            FROM chat_feedback;
        `;

        const [statsResult, deptResult, branchResult, feedbackResult] = await Promise.all([
            pool.query(statsQuery),
            pool.query(departmentBreakdownQuery),
            pool.query(branchBreakdownQuery),
            pool.query(feedbackStatsQuery)
        ]);

        const stats = statsResult.rows[0];
        const feedbackStats = feedbackResult.rows[0];

        return res.status(200).json({
            success: true,
            message: "Analytics summary retrieved successfully",
            data: {
                students: {
                    totalStudents: stats.total_students,
                    registeredUserAccounts: stats.total_student_accounts,
                    activeStudentsAskingQuestions: stats.active_students_count
                },
                followups: {
                    pendingCallbacks: stats.pending_callbacks_count,
                    queriesNeedingFollowup: stats.queries_needing_followup
                },
                questions: {
                    totalQuestionsAsked: stats.total_questions_asked,
                    guestQuestions: stats.guest_questions_count,
                    questionsLast24Hours: stats.questions_last_24h,
                    questionsLast7Days: stats.questions_last_7d
                },
                feedback: {
                    totalFeedback: feedbackStats.total_feedback,
                    averageRating: Number(feedbackStats.average_rating),
                    positiveFeedbackCount: feedbackStats.positive_feedback_count,
                    breakdown: [
                        { stars: 5, label: "Exceptional (5★)", count: feedbackStats.count_5_star },
                        { stars: 4, label: "Helpful (4★)", count: feedbackStats.count_4_star },
                        { stars: 3, label: "Good (3★)", count: feedbackStats.count_3_star },
                        { stars: 2, label: "Fair (2★)", count: feedbackStats.count_2_star },
                        { stars: 1, label: "Poor (1★)", count: feedbackStats.count_1_star }
                    ]
                },
                departmentBreakdown: deptResult.rows,
                branchDemandBreakdown: branchResult.rows
            }
        });
    } catch (error) {
        console.error("[Analytics Summary Error]:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve analytics summary",
            error: error.message
        });
    }
};

const getChatLogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            student_id,
            department_id,
            startDate,
            endDate,
            needs_followup,
            callback_requested,
            target_branch,
            followup_status
        } = req.query;

        const parsedPage = Math.max(1, parseInt(page, 10) || 1);
        const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const offset = (parsedPage - 1) * parsedLimit;

        const conditions = [];
        const params = [];
        let paramIndex = 1;

        if (search && search.trim() !== "") {
            conditions.push(`(c.user_message ILIKE $${paramIndex} OR c.ai_reply ILIKE $${paramIndex} OR s.full_name ILIKE $${paramIndex} OR s.phone ILIKE $${paramIndex})`);
            params.push(`%${search.trim()}%`);
            paramIndex++;
        }

        if (student_id) {
            conditions.push(`c.student_id = $${paramIndex}`);
            params.push(student_id);
            paramIndex++;
        }

        if (department_id) {
            conditions.push(`c.department_id = $${paramIndex}`);
            params.push(department_id);
            paramIndex++;
        }

        if (startDate) {
            conditions.push(`c.created_at >= $${paramIndex}::timestamp`);
            params.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            conditions.push(`c.created_at <= $${paramIndex}::timestamp`);
            params.push(endDate);
            paramIndex++;
        }

        if (needs_followup === "true" || needs_followup === "1") {
            conditions.push(`c.needs_followup = TRUE`);
        }

        if (callback_requested === "true" || callback_requested === "1") {
            conditions.push(`s.callback_requested = TRUE`);
        }

        if (target_branch) {
            conditions.push(`s.target_branch ILIKE $${paramIndex}`);
            params.push(`%${target_branch.trim()}%`);
            paramIndex++;
        }

        if (followup_status) {
            conditions.push(`s.followup_status = $${paramIndex}`);
            params.push(followup_status);
            paramIndex++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        // Query total count for pagination metadata
        const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM chat_history c
            LEFT JOIN students s ON c.student_id = s.student_id
            ${whereClause}
        `;
        const dataQuery = `
            SELECT
                c.chat_id,
                c.user_message AS question,
                c.ai_reply AS answer,
                c.needs_followup,
                c.created_at,
                c.department_id,
                d.name AS department_name,
                c.student_id,
                s.full_name AS student_name,
                s.email AS student_email,
                s.phone AS student_phone,
                s.target_branch,
                s.entrance_score,
                s.callback_requested,
                s.followup_status,
                s.notes AS counselor_notes
            FROM chat_history c
            LEFT JOIN students s ON c.student_id = s.student_id
            LEFT JOIN departments d ON c.department_id = d.department_id
            ${whereClause}
            ORDER BY c.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
        `;

        const [countResult, dataResult] = await Promise.all([
            pool.query(countQuery, params),
            pool.query(dataQuery, [...params, parsedLimit, offset])
        ]);

        const totalRecords = countResult.rows[0]?.total || 0;
        const totalPages = Math.ceil(totalRecords / parsedLimit);

        const formattedChats = dataResult.rows.map((row) => ({
            chat_id: row.chat_id,
            question: row.question,
            answer: row.answer,
            needs_followup: Boolean(row.needs_followup),
            created_at: row.created_at,
            department: row.department_id
                ? {
                      department_id: row.department_id,
                      name: row.department_name
                  }
                : null,
            student: row.student_id
                ? {
                      student_id: row.student_id,
                      full_name: row.student_name,
                      email: row.student_email,
                      phone: row.student_phone,
                      target_branch: row.target_branch,
                      entrance_score: row.entrance_score,
                      callback_requested: Boolean(row.callback_requested),
                      followup_status: row.followup_status,
                      counselor_notes: row.counselor_notes
                  }
                : null
        }));

        return res.status(200).json({
            success: true,
            pagination: {
                totalRecords,
                page: parsedPage,
                limit: parsedLimit,
                totalPages,
                hasNextPage: parsedPage < totalPages,
                hasPrevPage: parsedPage > 1
            },
            chats: formattedChats
        });
    } catch (error) {
        console.error("[Chat Logs Error]:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve chat logs",
            error: error.message
        });
    }
};
const getStudentChatHistory = async (req, res) => {
    try {
        const { student_id } = req.params;

        if (!student_id) {
            return res.status(400).json({
                success: false,
                message: "student_id parameter is required"
            });
        }

        // Fetch student details
        const studentQuery = `
            SELECT 
                student_id, full_name, email, phone, category,
                target_branch, entrance_score, callback_requested,
                followup_status, notes, created_at, updated_at
            FROM students
            WHERE student_id = $1;
        `;
        const studentResult = await pool.query(studentQuery, [student_id]);

        if (studentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        // Fetch chat interactions
        const chatsQuery = `
            SELECT
                c.chat_id,
                c.user_message AS question,
                c.ai_reply AS answer,
                c.needs_followup,
                c.created_at,
                d.name AS department_name
            FROM chat_history c
            LEFT JOIN departments d ON c.department_id = d.department_id
            WHERE c.student_id = $1
            ORDER BY c.created_at ASC;
        `;
        const chatsResult = await pool.query(chatsQuery, [student_id]);

        return res.status(200).json({
            success: true,
            student: studentResult.rows[0],
            totalQuestions: chatsResult.rows.length,
            chats: chatsResult.rows
        });
    } catch (error) {
        console.error("[Student Chat History Error]:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve student chat history",
            error: error.message
        });
    }
};

/**
 * PATCH /api/admin/analytics/students/:student_id/followup
 * Update the counselor follow-up stage and notes for an applicant
 */
const updateStudentFollowup = async (req, res) => {
    try {
        const { student_id } = req.params;
        const { followup_status, notes, callback_requested } = req.body;

        const result = await pool.query(
            `UPDATE students
             SET followup_status = COALESCE($1, followup_status),
                 notes = COALESCE($2, notes),
                 callback_requested = COALESCE($3, callback_requested),
                 updated_at = NOW()
             WHERE student_id = $4
             RETURNING student_id, full_name, phone, target_branch, followup_status, notes, callback_requested`,
            [followup_status || null, notes !== undefined ? notes : null, callback_requested !== undefined ? Boolean(callback_requested) : null, student_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Student follow-up status updated successfully",
            student: result.rows[0]
        });
    } catch (error) {
        console.error("[Update Followup Error]:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update student follow-up",
            error: error.message
        });
    }
};

/**
 * GET /api/admin/analytics/feedback
 * Provides aggregated feedback statistics and recent feedback submissions
 */
const getFeedbackAnalytics = async (req, res) => {
    try {
        const statsQuery = `
            SELECT
                COUNT(*)::int AS total_feedback,
                COALESCE(ROUND(AVG(rating)::numeric, 2), 0) AS average_rating,
                COUNT(*) FILTER (WHERE rating >= 4)::int AS positive_feedback_count,
                COUNT(*) FILTER (WHERE rating = 5)::int AS count_5_star,
                COUNT(*) FILTER (WHERE rating = 4)::int AS count_4_star,
                COUNT(*) FILTER (WHERE rating = 3)::int AS count_3_star,
                COUNT(*) FILTER (WHERE rating = 2)::int AS count_2_star,
                COUNT(*) FILTER (WHERE rating = 1)::int AS count_1_star
            FROM chat_feedback;
        `;

        const recentQuery = `
            SELECT
                f.feedback_id,
                f.rating,
                f.user_message,
                f.ai_reply,
                f.created_at,
                f.student_id,
                s.full_name AS student_name,
                s.email AS student_email,
                s.phone AS student_phone,
                s.target_branch,
                s.callback_requested
            FROM chat_feedback f
            LEFT JOIN students s ON f.student_id = s.student_id
            ORDER BY f.created_at DESC
            LIMIT 50;
        `;

        const [statsResult, recentResult] = await Promise.all([
            pool.query(statsQuery),
            pool.query(recentQuery)
        ]);

        const stats = statsResult.rows[0];

        return res.status(200).json({
            success: true,
            data: {
                totalFeedback: stats.total_feedback,
                averageRating: Number(stats.average_rating),
                positiveFeedbackCount: stats.positive_feedback_count,
                ratingBreakdown: [
                    { stars: 5, label: "5 Stars", count: stats.count_5_star },
                    { stars: 4, label: "4 Stars", count: stats.count_4_star },
                    { stars: 3, label: "3 Stars", count: stats.count_3_star },
                    { stars: 2, label: "2 Stars", count: stats.count_2_star },
                    { stars: 1, label: "1 Star", count: stats.count_1_star },
                ],
                recentFeedback: recentResult.rows
            }
        });
    } catch (error) {
        console.error("[Feedback Analytics Error]:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve feedback analytics",
            error: error.message
        });
    }
};

module.exports = {
    getAnalyticsSummary,
    getChatLogs,
    getStudentChatHistory,
    updateStudentFollowup,
    getFeedbackAnalytics
};
