import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    
    if (token == null) {
        return res.status(401).json({ message: "Akses ditolak. Tidak ada token otentikasi." });
    }

    console.log("Authorization Header:", authHeader);
    console.log("Extracted Token:", token);
    console.log("process.env.JWT_SECRET:", process.env.JWT_SECRET);

    jwt.verify(token, process.env.JWT_SECRET, async (err, userPayload) => {
        if (err) {
            console.log(err);
            return res.status(403).json({ message: "Token tidak valid atau kedaluwarsa." });
        }

        try {
            const user = await prisma.user.findUnique({
                where: { user_id: userPayload.user_id },
                select: { user_id: true, username: true, email: true }
            });

            if (!user) {
                return res.status(404).json({ message: "Pengguna tidak ditemukan." });
            }

            req.user = user;
            next();
        } catch (dbError) {
            console.error("Error fetching user during token verification:", dbError);
            return res.status(500).json({ message: "Internal server error during authentication." });
        }
    });
};