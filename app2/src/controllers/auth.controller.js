import { prisma } from '../config/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const generateToken = (user_id) => {
    return jwt.sign({ user_id }, process.env.JWT_SECRET, { expiresIn: '1h' });
};


export const register = async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: "Semua field harus diisi." });
    }

    try {
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { username }]
            }
        });

        if (existingUser) {
            return res.status(409).json({ message: "Email atau Username sudah terdaftar." });
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                // Nilai default untuk field yang akan dijadikan target injeksi di endpoint lain
                profile_picture_path: null, 
            },
            select: { user_id: true, username: true, email: true }
        });

        res.status(201).json({ message: "Registrasi berhasil.", user: newUser });

    } catch (error) {
        console.error("Error during registration:", error);
        res.status(500).json({ message: "Gagal memproses registrasi.", error: error.message });
    }
};


export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email dan password harus diisi." });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(401).json({ message: "Kredensial tidak valid." });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: "Kredensial tidak valid." });
        }

        const token = generateToken(user.user_id);

        res.status(200).json({
            message: "Login berhasil.",
            token,
            user: {
                user_id: user.user_id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: "Gagal memproses login.", error: error.message });
    }
};

export const logout = (req, res) => {
    res.status(200).json({ message: "Logout berhasil." });
};