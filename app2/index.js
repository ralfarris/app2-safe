import express from "express";
import dotenv from 'dotenv';
import authRoutes from "./src/routes/auth.routes.js";
import threadRoutes from "./src/routes/thread.routes.js";
import userRoutes from "./src/routes/user.routes.js";
import attachmentRoutes from "./src/routes/attachment.routes.js";
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import multer from 'multer';

const uploadDir = 'uploads';
const profileDir = path.join(uploadDir, 'profiles');
const attachmentDir = path.join(uploadDir, 'attachments');

// Fungsi untuk memastikan direktori ada
const ensureDirExists = (dir) => {
    if (!fs.existsSync(dir)) {
        console.log(`Creating directory: ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
    }
};

ensureDirExists(profileDir);
ensureDirExists(attachmentDir);
dotenv.config(); 

const app = express();
const port = process.env.PORT || 3000;

const corsOptions = {
  origin: 'http://localhost:3001', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'], 
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Middleware Global
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("Apps2 Backend Running (Express + Prisma)");
});

// ROUTE API
app.use("/auth", authRoutes);
app.use("/threads", threadRoutes);
app.use("/users", userRoutes);
app.use("/posts", attachmentRoutes); 
app.use('/uploads', express.static('uploads')); 

// Error Handling Middleware
app.use((err, req, res, next) => {
  // Tangkap error Multer
  if (err instanceof multer.MulterError) {
    console.error("Multer Error:", err);
    return res.status(400).send({ 
        message: `File upload failed: ${err.message}`, 
        error: err.code 
    });
  }
  
  // Tangkap error File System (ENOTDIR) yang tidak tertangkap Multer
  if (err.code === 'ENOTDIR') {
      console.error("File System Error:", err);
      return res.status(500).send({
          message: "Internal Server Error",
          error: "ENOTDIR: Direktori file upload bermasalah. Cek konfigurasi volume Docker."
      });
  }

  // General Error
  console.error("General Server Error Stack:", err.stack);
  res.status(500).send({ 
    message: 'Something broke!', 
    error: err.message 
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});