const express = require("express");
const router = express.Router();
const { chatWithMitra, submitFeedback, requestCallback } = require("../controllers/chat.controller");
const jwt = require("jsonwebtoken");

const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if(authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try{
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
        } 
        catch{
        }
    }
    next();
};
router.post("/", optionalAuth, chatWithMitra);
router.post("/feedback", optionalAuth, submitFeedback);
router.post("/request-callback", optionalAuth, requestCallback);

module.exports = router;
