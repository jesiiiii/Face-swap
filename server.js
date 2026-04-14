const express = require(‘express’);
const multer = require(‘multer’);
const cors = require(‘cors’);
const path = require(‘path’);
const fs = require(‘fs’);
const cloudinary = require(‘cloudinary’).v2;
require(‘dotenv’).config();

const app = express();
const PORT = process.env.PORT || 3000;

// Cloudinary Configuration
cloudinary.config({
cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '’,
api_key: process.env.CLOUDINARY_API_KEY || ‘’,
api_secret: process.env.CLOUDINARY_API_SECRET || ‘’
});

const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || ‘Namiss’;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || ‘’;

// Ensure directories exist
const uploadDir = ‘./uploads’;
const outputDir = ‘./outputs’;
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, ‘public’)));

// Configure multer
const storage = multer.diskStorage({
destination: (req, file, cb) => cb(null, uploadDir),
filename: (req, file, cb) => {
const uniqueSuffix = Date.now() + ‘-’ + Math.round(Math.random() * 1E9);
cb(null, uniqueSuffix + path.extname(file.originalname));
}
});

const upload = multer({
storage: storage,
limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// ====================
// API Routes
// ====================

// Health check
app.get(’/api/health’, (req, res) => {
res.json({ status: ‘ok’, message: ‘Face Swap API is running’ });
});

// Progress tracker
let progressData = { percent: 0, status: ‘’ };
function updateProgress(percent, status) {
progressData = { percent, status };
}

app.get(’/api/progress’, (req, res) => {
res.json(progressData);
});

// Face Swap: Cloudinary Upload + Replicate Processing
app.post(’/api/face-swap’, upload.fields([
{ name: ‘sourceImage’, maxCount: 1 },
{ name: ‘targetVideo’, maxCount: 1 }
]), async (req, res) => {
try {
const sourceFile = req.files[‘sourceImage’]?.[0];
const targetFile = req.files[‘targetVideo’]?.[0];

```
    if (!sourceFile || !targetFile) {
        return res.status(400).json({
            success: false,
            error: 'Both source image and target video are required'
        });
    }

    updateProgress(10, 'جاري رفع الصورة إلى Cloudinary...');

    // Upload source image to Cloudinary
    const sourceUpload = await cloudinary.uploader.upload(sourceFile.path, {
        upload_preset: UPLOAD_PRESET,
        folder: 'face-swap/source'
    });

    updateProgress(30, 'جاري رفع الفيديو إلى Cloudinary...');

    // Upload target video to Cloudinary
    const targetUpload = await cloudinary.uploader.upload(targetFile.path, {
        upload_preset: UPLOAD_PRESET,
        resource_type: 'video',
        folder: 'face-swap/target'
    });

    updateProgress(50, 'جاري إرسال الطلب إلى Replicate...');

    // Send URLs to Replicate for face swap
    const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
            'Authorization': `Token ${REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            version: "9a4f3b691b16a1ee42ca47e35dc3e302f2b71b9c5b7f66cf1f0d2aa80f90c1f3",
            input: {
                swap_image: sourceUpload.secure_url,
                target_image: targetUpload.secure_url
            }
        })
    });

    const prediction = await response.json();

    if (!prediction.id) {
        throw new Error('Failed to start prediction');
    }

    updateProgress(60, 'جاري معالجة استبدال الوجه...');

    // Poll for result
    let result = prediction;
    while (result.status !== 'succeeded' && result.status !== 'failed') {
        await new Promise(r => setTimeout(r, 2000));
        const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
            headers: { 'Authorization': `Token ${REPLICATE_API_TOKEN}` }
        });
        result = await pollResponse.json();
        updateProgress(80, 'جاري الانتظار...');
    }

    // Clean up local files
    fs.unlinkSync(sourceFile.path);
    fs.unlinkSync(targetFile.path);

    if (result.status === 'failed') {
        throw new Error(result.error || 'Face swap failed');
    }

    updateProgress(100, 'اكتمل!');

    res.json({
        success: true,
        message: 'Face swap completed successfully',
        result: {
            videoUrl: result.output,
            sourceUrl: sourceUpload.secure_url,
            originalUrl: targetUpload.secure_url
        }
    });

} catch (error) {
    console.error('Face swap error:', error);
    res.status(500).json({
        success: false,
        error: error.message || 'Face swap processing failed'
    });
}
```

});

// Error handling
app.use((err, req, res, next) => {
console.error(‘Error:’, err);
res.status(500).json({
success: false,
error: err.message || ‘Internal server error’
});
});

app.listen(PORT, () => {
console.log(`Face Swap Server running on http://localhost:${PORT}`);
console.log(`Cloud Name: ${cloudinary.config().cloud_name}`);
});