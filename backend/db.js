import {Pool} from 'pg'
import dotenv from 'dotenv'
dotenv.config()

export const pool=new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    max:10,
});

(async()=>{

    try {
         const res = await pool.query("select Now()")
         console.log("Database is connected successfully")
         
    } catch (error) {
        console.log(error.message)
    }
})();