const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const fetch = require('node-fetch');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running 🚀");
});

// ====================
// ENV
// ====================
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const API_SECRET = process.env.API_SECRET || "super-secret-key";

// ====================
// Cloudinary
// ====================
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// ====================
// Middleware
// ====================
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, 'public')));

// ====================
// Multer (Memory)
// ====================
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
    }
});

// ====================
// Rate Limit
// ====================
const faceSwapLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        error: "Too many requests, try later"
    }
});

// ====================
// API Key Middleware
// ====================
function checkApiKey(req, res, next) {
    const key = req.headers['x-api-key'];

    if (!key || key !== API_SECRET) {
        return res.status(403).json({
            success: false,
            error: "Unauthorized"
        });
    }

    next();
}

// ====================
// Cloudinary Upload
// ====================
function uploadToCloudinary(buffer, options = {}) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { resource_type: "auto", ...options },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        streamifier.createReadStream(buffer).pipe(stream);
    });
}

// ====================
// Health
// ====================
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'API running 🚀' });
});

// ====================
// Face Swap
// ====================
app.post('/api/face-swap',
    checkApiKey,
    faceSwapLimiter,
    upload.fields([
        { name: 'sourceImage', maxCount: 1 },
        { name: 'targetVideo', maxCount: 1 }
    ]),
    async (req, res) => {
        try {
            const sourceFile = req.files['sourceImage']?.[0];
            const targetFile = req.files['targetVideo']?.[0];

            if (!sourceFile || !targetFile) {
                return res.status(400).json({
                    success: false,
                    error: "Image and video required"
                });
            }

            console.log("📤 Uploading to Cloudinary...");

            const sourceUpload = await uploadToCloudinary(sourceFile.buffer, {
                folder: "face-swap/source"
            });

            const targetUpload = await uploadToCloudinary(targetFile.buffer, {
                resource_type: "video",
                folder: "face-swap/target"
            });

            console.log("🧠 Sending to Replicate...");

            const start = await fetch("https://api.replicate.com/v1/predictions", {
                method: "POST",
                headers: {
                    "Authorization": `Token ${REPLICATE_API_TOKEN}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    version: "9a4f3b691b16a1ee42ca47e35dc3e302f2b71b9c5b7f66cf1f0d2aa80f90c1f3",
                    input: {
                        swap_image: sourceUpload.secure_url,
                        target_video: targetUpload.secure_url
                    }
                })
            });

            let prediction = await start.json();

            if (!prediction.id) {
                throw new Error("Failed to start AI job");
            }

            console.log("⏳ Processing...");

            // Polling
            while (prediction.status !== "succeeded" && prediction.status !== "failed") {
                await new Promise(r => setTimeout(r, 2000));

                const poll = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
                    headers: {
                        "Authorization": `Token ${REPLICATE_API_TOKEN}`
                    }
                });

                prediction = await poll.json();
            }

            if (prediction.status === "failed") {
                throw new Error(prediction.error || "AI failed");
            }

            console.log("✅ Done");

            res.json({
                success: true,
                result: {
                    videoUrl: prediction.output,
                    source: sourceUpload.secure_url,
                    target: targetUpload.secure_url
                }
            });

        } catch (err) {
            console.error("❌ Error:", err);
            res.status(500).json({
                success: false,
                error: err.message
            });
        }
    }
);

// ====================
// Error Handler
// ====================
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({
        success: false,
        error: err.message || "Server error"
    });
});

// ====================
// Start
// ====================
app.get("/", (req, res) => {
  res.send("Server is working 🔥");
});

app.listen(PORT, () => {
    console.log(`🔥 Server running on port ${PORT}`);
});