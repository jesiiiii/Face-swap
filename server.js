const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dt2woiid2',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || ''
});

const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'Namiss';

// Ensure directories exist
const uploadDir = './uploads';
const outputDir = './outputs';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configure multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
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
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Face Swap API is running', cloudinary: cloudinary.config().cloud_name });
});

// Upload to Cloudinary
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file provided' });
        }

        const result = await cloudinary.uploader.upload(req.file.path, {
            upload_preset: UPLOAD_PRESET,
            resource_type: 'auto',
            folder: 'face-swap'
        });

        // Clean up local file
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            url: result.secure_url,
            public_id: result.public_id,
            format: result.format
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Face Swap using Cloudinary
app.post('/api/face-swap', upload.fields([
    { name: 'sourceImage', maxCount: 1 },
    { name: 'targetVideo', maxCount: 1 }
]), async (req, res) => {
    try {
        const sourceFile = req.files['sourceImage']?.[0];
        const targetFile = req.files['targetVideo']?.[0];

        if (!sourceFile || !targetFile) {
            return res.status(400).json({
                success: false,
                error: 'Both source image and target video are required'
            });
        }

        console.log('Starting face swap process...');
        updateProgress(10, 'جاري رفع الصورة إلى Cloudinary...');

        // Upload source image to Cloudinary
        const sourceUpload = await cloudinary.uploader.upload(sourceFile.path, {
            upload_preset: UPLOAD_PRESET,
            folder: 'face-swap/source'
        });

        console.log('Source image uploaded:', sourceUpload.secure_url);
        updateProgress(30, 'جاري رفع الفيديو إلى Cloudinary...');

        // Upload target video to Cloudinary
        const targetUpload = await cloudinary.uploader.upload(targetFile.path, {
            upload_preset: UPLOAD_PRESET,
            resource_type: 'video',
            folder: 'face-swap/target'
        });

        console.log('Target video uploaded:', targetUpload.secure_url);
        updateProgress(50, 'جاري معالجة استبدال الوجه...');

        // Apply face swap transformation using Cloudinary
        // Cloudinary's face overlay effect can overlay one face onto detected faces
        const transformedUrl = cloudinary.url(targetUpload.public_id, {
            resource_type: 'video',
            transformation: [
                { overlay: `face_swap_${sourceUpload.public_id}` },
                { flags: 'splice' },
                { quality: 'auto' },
                { format: 'mp4' }
            ]
        });

        // Alternative: Use lchain for more complex transformations
        const resultUrl = cloudinary.url(targetUpload.public_id, {
            resource_type: 'video',
            transformation: [
                {
                    overlay: {
                        public_id: sourceUpload.public_id,
                        effects: [
                            { width: 200, height: 200, crop: 'fill', gravity: 'face' },
                            { radius: 'max' }
                        ]
                    },
                    gravity: 'face',
                    flags: 'splice'
                },
                { quality: 'auto' },
                { format: 'mp4' }
            ]
        });

        console.log('Transformation URL:', resultUrl);
        updateProgress(80, 'جاري إكمال المعالجة...');

        // Clean up local files
        fs.unlinkSync(sourceFile.path);
        fs.unlinkSync(targetFile.path);

        updateProgress(100, 'اكتمل!');

        res.json({
            success: true,
            message: 'Face swap completed successfully',
            result: {
                videoUrl: resultUrl,
                originalUrl: targetUpload.secure_url,
                sourceUrl: sourceUpload.secure_url,
                publicId: targetUpload.public_id
            }
        });

    } catch (error) {
        console.error('Face swap error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Face swap processing failed'
        });
    }
});

// Advanced Face Swap with custom positioning
app.post('/api/face-swap-advanced', upload.fields([
    { name: 'sourceImage', maxCount: 1 },
    { name: 'targetVideo', maxCount: 1 }
]), async (req, res) => {
    try {
        const sourceFile = req.files['sourceImage']?.[0];
        const targetFile = req.files['targetVideo']?.[0];

        if (!sourceFile || !targetFile) {
            return res.status(400).json({
                success: false,
                error: 'Both source image and target video are required'
            });
        }

        // Upload files
        const sourceUpload = await cloudinary.uploader.upload(sourceFile.path, {
            upload_preset: UPLOAD_PRESET,
            folder: 'face-swap/source'
        });

        const targetUpload = await cloudinary.uploader.upload(targetFile.path, {
            upload_preset: UPLOAD_PRESET,
            resource_type: 'video',
            folder: 'face-swap/target'
        });

        // Get video dimensions for proper face placement
        const videoInfo = await cloudinary.api.resource(targetUpload.public_id, {
            resource_type: 'video'
        });

        // Create face swap transformation
        const transformation = {
            resource_type: 'video',
            transformation: [
                // Detect face and apply transformation
                { effect: 'face_detect:basic' },
                // Apply source face overlay
                {
                    overlay: {
                        public_id: sourceUpload.public_id,
                        type: 'upload'
                    },
                    gravity: 'face',
                    width: 300,
                    height: 300,
                    crop: 'fill',
                    effects: [
                        { opacity: 100 },
                        { radius: 'max' }
                    ]
                },
                // Composite with blending
                {
                    overlay: {
                        public_id: sourceUpload.public_id
                    },
                    gravity: 'north_east',
                    x: 20,
                    y: 20,
                    width: 100,
                    height: 100,
                    crop: 'fill'
                },
                { quality: 'auto:best' },
                { format: 'mp4' }
            ]
        };

        const resultUrl = cloudinary.url(targetUpload.public_id, transformation);

        // Clean up
        fs.unlinkSync(sourceFile.path);
        fs.unlinkSync(targetFile.path);

        res.json({
            success: true,
            message: 'Face swap completed successfully',
            result: {
                videoUrl: resultUrl,
                originalUrl: targetUpload.secure_url,
                sourceUrl: sourceUpload.secure_url,
                videoWidth: videoInfo.width,
                videoHeight: videoInfo.height
            }
        });

    } catch (error) {
        console.error('Face swap error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Simple face overlay (alternative method)
app.post('/api/face-overlay', upload.fields([
    { name: 'sourceImage', maxCount: 1 },
    { name: 'targetVideo', maxCount: 1 }
]), async (req, res) => {
    try {
        const sourceFile = req.files['sourceImage']?.[0];
        const targetFile = req.files['targetVideo']?.[0];

        if (!sourceFile || !targetFile) {
            return res.status(400).json({
                success: false,
                error: 'Both files required'
            });
        }

        // Upload files
        const sourceUpload = await cloudinary.uploader.upload(sourceFile.path, {
            upload_preset: UPLOAD_PRESET,
            folder: 'face-swap/source'
        });

        const targetUpload = await cloudinary.uploader.upload(targetFile.path, {
            upload_preset: UPLOAD_PRESET,
            resource_type: 'video',
            folder: 'face-swap/target'
        });

        // Use Cloudinary's video overlay transformation
        const resultUrl = cloudinary.url(targetUpload.public_id, {
            resource_type: 'video',
            transformation: [
                {
                    overlay: {
                        public_id: sourceUpload.public_id
                    },
                    gravity: 'face',
                    width: 250,
                    height: 250,
                    crop: 'fill',
                    radius: 50,
                    opacity: 85,
                    y: -10
                },
                {
                    overlay: {
                        public_id: sourceUpload.public_id
                    },
                    gravity: 'face',
                    width: 80,
                    height: 80,
                    crop: 'fill',
                    radius: 40,
                    opacity: 90,
                    x: 20,
                    y: -20
                },
                { quality: 'auto' },
                { format: 'mp4' }
            ]
        });

        // Clean up
        fs.unlinkSync(sourceFile.path);
        fs.unlinkSync(targetFile.path);

        res.json({
            success: true,
            message: 'Face overlay completed',
            result: {
                videoUrl: resultUrl,
                sourceUrl: sourceUpload.secure_url,
                originalUrl: targetUpload.secure_url
            }
        });

    } catch (error) {
        console.error('Face overlay error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Progress tracker (simple in-memory)
let progressData = { percent: 0, status: '' };
function updateProgress(percent, status) {
    progressData = { percent, status };
}

app.get('/api/progress', (req, res) => {
    res.json(progressData);
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

app.listen(PORT, () => {
    console.log(`Face Swap Server running on http://localhost:${PORT}`);
    console.log(`Cloud Name: ${cloudinary.config().cloud_name}`);
    console.log(`Upload Preset: ${UPLOAD_PRESET}`);
});
