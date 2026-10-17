const pool = require("../config/db");
const jwt = require("jsonwebtoken");

const registerUser=async(req, res) => {
    try{
        const{ 
            full_name, 
            phone_number, 
            password, 
            role, 
            student_id, counselor_id, 
            email, 
            target_branch, 
            entrance_score 
        }=req.body;
        if(!full_name || !phone_number || !password || !role){
            return res.status(400).json({
                success: false,
                message: "Fill all the required fields."
            });
        }
        let sid = student_id || null;
        if(role === "Student" && !sid){
            try{
                const studentResult=await pool.query(
                    `INSERT INTO students (full_name, phone, email, target_branch, entrance_score)
                     VALUES ($1, $2, $3, $4, $5)
                     RETURNING student_id`,
                    [
                        full_name.trim(),
                        phone_number.trim(),
                        email?email.trim():null,
                        target_branch || null,
                        entrance_score || null
                    ]
                );
                sid = studentResult.rows[0].student_id;
            } 
            catch(err){
                console.warn("[Register] Could not pre-create students row:", err.message);
            }
        }

        const result = await pool.query(
            `INSERT INTO users_auth (
                full_name,
                phone_number,
                password_hash,
                role,
                student_id,
                counselor_id
            )
            VALUES (
                $1, $2,
                crypt($3, gen_salt('bf')),
                $4, $5, $6
            )
            RETURNING user_id, full_name, phone_number, role, student_id, counselor_id;`,
            [
                full_name.trim(),
                phone_number.trim(),
                password,
                role,
                sid,
                counselor_id || null,
            ]
        );
        const user = result.rows[0];
        const token=jwt.sign(
            {
                user_id: user.user_id,
                role: user.role,
                full_name: user.full_name,
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.status(201).json({
            success: true,
            message: "Registration Successful",
            token,
            user: {
        // If a Student registers without an existing student_id, create the student record
                ...user,
                target_branch: target_branch || null,
                entrance_score: entrance_score || null,
                email: email || null
            }
        });
    } 
    catch(error){
        console.error("Register Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};

const loginUser=async(req, res) => {
    try{
        const { full_name, username, password } = req.body;
        const loginIdentifier=full_name || username;

        if (!loginIdentifier || !password) {
            return res.status(400).json({
                success: false,
                message: "full_name and password are required."
            });
        }

        const result = await pool.query(
            `SELECT
                u.user_id,
                u.full_name,
                u.phone_number,
                u.role,
                u.student_id,
                u.counselor_id,
                s.email,
                s.target_branch,
                s.entrance_score,
                s.category,
                s.callback_requested,
                s.followup_status
            FROM users_auth u
            LEFT JOIN students s ON u.student_id = s.student_id
            WHERE (u.full_name = $1 OR u.phone_number = $1)
              AND u.password_hash = crypt($2, u.password_hash)`,
            [loginIdentifier.trim(), password]
        );
        if(result.rows.length === 0){
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        const user=result.rows[0];
        const token=jwt.sign(
            { 
                user_id: user.user_id, 
                role: user.role,
                full_name: user.full_name,
                student_id: user.student_id
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.status(200).json({
            success: true,
            message: "Login Successful",
            token,
            user
        });
    } 
    catch(error){
        console.error("Login Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const getUser=async(req, res) => {
    try{
        const userId=req.user.user_id;
        const result=await pool.query(
            `SELECT 
                u.user_id,
                u.full_name,
                u.phone_number,
                u.role,
                u.student_id,
                u.counselor_id,
                u.created_at,
                u.updated_at,
                s.email,
                s.target_branch,
                s.entrance_score,
                s.category,
                s.callback_requested,
                s.followup_status,
                s.notes
             FROM users_auth u
             LEFT JOIN students s ON u.student_id = s.student_id
             WHERE u.user_id = $1`,
            [userId]
        );

        if(result.rows.length === 0){
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        return res.status(200).json({
            success: true,
            user: result.rows[0]
        });
    } 
    catch(err){
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const updateProfile=async(req, res) => {
    try {
        const userId=req.user?.user_id;
        const{ full_name, phone_number, email, target_branch, entrance_score, category, callback_requested } = req.body;

        const userRes=await pool.query("SELECT student_id, full_name, phone_number FROM users_auth WHERE user_id = $1", [userId]);
        if(userRes.rows.length === 0){
            return res.status(404).json({ success: false, message: "User not found" });
        }

        let sid=userRes.rows[0].student_id;

        if(!sid){
            const newStudent = await pool.query(
                `INSERT INTO students (full_name, phone, email, target_branch, entrance_score, category, callback_requested)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING student_id`,
                [
                    full_name || userRes.rows[0].full_name || "Student",
                    phone_number || userRes.rows[0].phone_number || "",
                    email || null,
                    target_branch || null,
                    entrance_score || null,
                    category || null,
                    callback_requested || false
                ]
            );
            sid = newStudent.rows[0].student_id;
            await pool.query("UPDATE users_auth SET student_id = $1 WHERE user_id = $2", [sid, userId]);
        } 
        else{
            await pool.query(
                `UPDATE students
                 SET full_name = COALESCE($1, full_name),
                     phone = COALESCE($2, phone),
                     email = COALESCE($3, email),
                     target_branch = COALESCE($4, target_branch),
                     entrance_score = COALESCE($5, entrance_score),
                     category = COALESCE($6, category),
                     callback_requested = COALESCE($7, callback_requested),
                     updated_at = NOW()
                 WHERE student_id = $8`,
                [full_name, phone_number, email, target_branch, entrance_score, category, callback_requested, sid]
            );
        }

        if(full_name || phone_number){
            await pool.query(
                `UPDATE users_auth
                 SET full_name = COALESCE($1, full_name),
                     phone_number = COALESCE($2, phone_number),
                     updated_at = NOW()
                 WHERE user_id = $3`,
                [full_name, phone_number, userId]
            );
        }

        const updated=await pool.query(
            `SELECT 
                u.user_id, u.full_name, u.phone_number, u.role, u.student_id, u.counselor_id,
                s.email, s.target_branch, s.entrance_score, s.category, s.callback_requested, s.followup_status
             FROM users_auth u
             LEFT JOIN students s ON u.student_id = s.student_id
             WHERE u.user_id = $1`,
            [userId]
        );

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: updated.rows[0]
        });
    } catch(err) {
        console.error("Update Profile Error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const logoutUser=async(req, res) => {
    return res.status(200).json({
        success: true,
        message: "Logout Success !!"
    });
};

module.exports = { registerUser, loginUser, getUser, updateProfile, logoutUser };