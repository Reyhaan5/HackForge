const { Pool }=require("pg");
require("dotenv").config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

pool.connect()
    .then(()=>console.log("Database Connected !!"))
    .catch((err)=>{
        console.log("Database Connection Error: ",err)
    });

module.exports = pool;
//npm install express pg dotenv jsonwebtoken cookie-parser cors morgan helmet express-rate-limit