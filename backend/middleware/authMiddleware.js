import jwt from 'jsonwebtoken'
import 'dotenv/config'

export const authMiddleware=(req,res,next)=>{
    const authHeader=req.headers.authorization
    if(!authHeader){
        return res.status(401).send("Unauthorized")
    }
    const token=authHeader.split(" ")[1]
    try {
        const verify=jwt.verify(token,process.env.JWT_SECRET)
        req.user = verify
        next()
    } catch (error) {
         return res.status(401).send("Invalid token")
    }
}