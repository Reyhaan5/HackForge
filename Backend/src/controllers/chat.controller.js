const pool = require("../config/db");
const RAG_SERVICE_URL=process.env.RAG_SERVICE_URL || "http://localhost:5000";

const chatWithMitra = async(req, res) => {
    try{
        const { query, query_text, message, student_id, language, needs_followup } = req.body;
        const prompt=query || query_text || message;

        if(!prompt || !String(prompt).trim()){
            return res.status(400).json({
                error: "Missing query in request body",
                answer: "Please ask a question."
            });
        }

        const sid=student_id || req.user?.student_id || req.user?.id || null;
        const selectedLanguage = language || "English";

        console.log(`[Backend Chat] Query: "${prompt.trim()}" | Language: "${selectedLanguage}" | Student ID: ${sid}`);

        const ragResponse=await fetch(`${RAG_SERVICE_URL}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                query: prompt.trim(),
                student_id: sid,
                language: selectedLanguage,
                needs_followup: Boolean(needs_followup)
            })
        });

        if(!ragResponse.ok){
            const errBody = await ragResponse.text();
            console.error("[RAG Service Error]:", ragResponse.status, errBody);
            return res.status(ragResponse.status).json({
                error: "RAG service returned an error",
                details: errBody
            });
        }
        const data = await ragResponse.json();
        if(needs_followup && data.chat_id){
            try{
                await pool.query("UPDATE chat_history SET needs_followup = TRUE WHERE chat_id = $1", [data.chat_id]);
            }
            catch(e){
                console.warn("[Backend Chat] Error flagging chat followup:", e.message);
            }
        }

        return res.status(200).json(data);
    } 
    catch(error){
        console.error("Chat Error: ", error);
        return res.status(500).json({
            error: "Failed to communicate with RAG service",
            details: error.message
        });
    }
};

const submitFeedback = async(req, res) => {
    try {
        const { rating, user_message, ai_reply, student_id, chat_id, callback_requested } = req.body;
        const numericRating = Number(rating);

        if (!numericRating || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({
                error: "Feedback rating must be an integer between 1 and 5",
                success: false
            });
        }

        const sid = student_id || req.user?.student_id || req.user?.id || null;

        // Verify that student_id exists in students table before inserting foreign key
        let validStudentId = null;
        if (sid) {
            try {
                const sCheck = await pool.query(
                    "SELECT student_id FROM students WHERE student_id = $1",
                    [sid]
                );
                if (sCheck.rows.length > 0) {
                    validStudentId = sCheck.rows[0].student_id;
                }
            } catch (err) {
                console.warn("[Feedback] Invalid student_id format/not found:", sid);
            }
        }

        // Verify that chat_id exists in chat_history table before inserting foreign key
        let validChatId = null;
        if (chat_id) {
            try {
                const cCheck = await pool.query(
                    "SELECT chat_id FROM chat_history WHERE chat_id = $1",
                    [chat_id]
                );
                if (cCheck.rows.length > 0) {
                    validChatId = cCheck.rows[0].chat_id;
                }
            } catch (err) {
                console.warn("[Feedback] Invalid chat_id format/not found:", chat_id);
            }
        }

        const result = await pool.query(`
            INSERT INTO chat_feedback(
                student_id,
                chat_id,
                rating,
                user_message,
                ai_reply
            )
            VALUES($1, $2, $3, $4, $5)
            RETURNING feedback_id, rating, created_at;
            `,
            [validStudentId, validChatId, numericRating, user_message || null, ai_reply || null]
        );

        // If student requested follow-up alongside feedback
        if (callback_requested) {
            if (validStudentId) {
                await pool.query(
                    "UPDATE students SET callback_requested = TRUE, followup_status = 'Pending', updated_at = NOW() WHERE student_id = $1",
                    [validStudentId]
                );
            }
            if (validChatId) {
                await pool.query(
                    "UPDATE chat_history SET needs_followup = TRUE WHERE chat_id = $1",
                    [validChatId]
                );
            }
        }

        const savedFeedback = result.rows[0];
        return res.status(201).json({
            success: true,
            message: "Feedback submitted successfully",
            feedback_id: savedFeedback.feedback_id,
            rating: savedFeedback.rating,
            callback_requested: Boolean(callback_requested),
            created_at: savedFeedback.created_at
        });
    } 
    catch(error) {
        console.error("Feedback Submission Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to submit feedback",
            details: error.message
        });
    }
};
const requestCallback = async (req, res) => {
    try{
        const { student_id, phone, full_name, target_branch, chat_id, notes } = req.body;
        const sid=student_id || req.user?.student_id || req.user?.id || null;

        let validStudentId=null;
        if(sid){
            try{
                const sCheck=await pool.query("SELECT student_id FROM students WHERE student_id = $1", [sid]);
                if(sCheck.rows.length > 0){
                    validStudentId=sCheck.rows[0].student_id;
                    await pool.query(
                        `UPDATE students
                         SET callback_requested = TRUE,
                             followup_status = 'Pending',
                             phone = COALESCE($1, phone),
                             full_name = COALESCE($2, full_name),
                             target_branch = COALESCE($3, target_branch),
                             notes = COALESCE($4, notes),
                             updated_at = NOW()
                         WHERE student_id = $5`,
                        [phone ? phone.trim() : null, full_name ? full_name.trim() : null, target_branch || null, notes || null, validStudentId]
                    );
                }
            } 
            catch(err){
                console.warn("[Callback] Student query error:", err.message);
            }
        }
        if(!validStudentId && phone){
            const newStudent = await pool.query(
                `INSERT INTO students (full_name, phone, target_branch, callback_requested, followup_status, notes)
                 VALUES ($1, $2, $3, TRUE, 'Pending', $4)
                 RETURNING student_id`,
                [full_name ? full_name.trim() : "Prospective Student", phone.trim(), target_branch || null, notes || null]
            );
            validStudentId = newStudent.rows[0].student_id;
        }

        if(chat_id){
            try{
                await pool.query("UPDATE chat_history SET needs_followup = TRUE WHERE chat_id = $1", [chat_id]);
            } 
            catch(err){
                console.warn("[Callback] Could not flag chat_history:", err.message);
            }
        }
        return res.status(200).json({
            success: true,
            message: "Counselor callback requested successfully. Our admission desk will reach out soon.",
            student_id: validStudentId
        });
    } 
    catch(error){
        console.error("Callback Request Error:", error);
        return res.status(500).json({ success: false, message: "Failed to request callback", error: error.message });
    }
};

module.exports = { chatWithMitra, submitFeedback, requestCallback };
