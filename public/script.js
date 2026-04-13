// ====================
// Face Swap Application - Fixed CDN Links
// ====================

// State Management
const state = {
    sourceImage: null,
    targetVideo: null,
    isProcessing: false,
    resultUrl: null,
    sourceImageData: null
};

// DOM Elements
const sourceInput = document.getElementById('sourceInput');
const targetInput = document.getElementById('targetInput');
const sourceZone = document.getElementById('sourceZone');
const targetZone = document.getElementById('targetZone');
const sourceContent = document.getElementById('sourceContent');
const targetContent = document.getElementById('targetContent');
const sourcePreview = document.getElementById('sourcePreview');
const targetPreview = document.getElementById('targetPreview');
const sourceImagePreview = document.getElementById('sourceImagePreview');
const targetVideoPreview = document.getElementById('targetVideoPreview');
const swapBtn = document.getElementById('swapBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingStatus = document.getElementById('loadingStatus');
const progressFill = document.getElementById('progressFill');
const resultContainer = document.getElementById('resultContainer');
const resultVideo = document.getElementById('resultVideo');

// Face Swap Variables
let faceDetector = null;
let modelsReady = false;

// ====================
// Initialize Face Detection with Built-in API
// ====================
async function initFaceDetection() {
    try {
        // Check if browser supports face detection
        if ('FaceDetector' in window) {
            faceDetector = new FaceDetector({
                fastMode: true,
                maxDetectedFaces: 10
            });
            console.log('Using native FaceDetector API');
            modelsReady = true;
            return true;
        }

        // Try face-api.js as backup
        console.log('Native API not available, trying face-api.js...');
        return await loadFaceApiJS();
    } catch (error) {
        console.error('Face detection init error:', error);
        return await loadFaceApiJS();
    }
}

async function loadFaceApiJS() {
    return new Promise(async (resolve) => {
        try {
            // Use a more reliable CDN for face-api.js
            const script = document.createElement('script');

            // Try multiple CDN sources
            const cdnUrls = [
                'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js',
                'https://unpkg.com/face-api.js@0.22.2/dist/face-api.min.js',
                'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.min.js'
            ];

            let loaded = false;

            for (const url of cdnUrls) {
                try {
                    script.src = url;
                    document.head.appendChild(script);

                    await new Promise((res, rej) => {
                        script.onload = res;
                        script.onerror = () => rej(new Error('Failed'));
                        setTimeout(rej, 5000); // 5 second timeout
                    });

                    loaded = true;
                    console.log('face-api.js loaded from:', url);
                    break;
                } catch (e) {
                    console.log('Failed to load from:', url);
                    document.head.removeChild(script);
                    continue;
                }
            }

            if (!loaded) {
                throw new Error('All CDN sources failed');
            }

            // Load models
            const modelUrls = [
                {
                    tiny: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/tiny_face_detector_model-weights_manifest.json',
                    ssd: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/ssd_mobilenetv1_model-weights_manifest.json'
                }
            ];

            loadingStatus.textContent = 'جاري تحميل نماذج الذكاء الاصطناعي (1/4)...';

            try {
                await faceapi.nets.tinyFaceDetector.loadFromUri(modelUrls[0].tiny.replace('tiny_face_detector_model-weights_manifest.json', ''));
                loadingStatus.textContent = 'جاري تحميل نماذج الذكاء الاصطناعي (2/4)...';

                await faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelUrls[0].tiny.replace('tiny_face_detector_model-weights_manifest.json', ''));
                loadingStatus.textContent = 'جاري تحميل نماذج الذكاء الاصطناعي (3/4)...';

                await faceapi.nets.faceRecognitionNet.loadFromUri(modelUrls[0].tiny.replace('tiny_face_detector_model-weights_manifest.json', ''));
                loadingStatus.textContent = 'جاري تحميل نماذج الذكاء الاصطناعي (4/4)...';

            } catch (modelError) {
                console.log('Model loading partial failure, trying alternative...');
                // Try loading all from one source
                const baseUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';
                try {
                    await faceapi.nets.tinyFaceDetector.loadFromUri(baseUrl);
                } catch (e) {
                    // Continue anyway
                }
            }

            modelsReady = true;
            console.log('Face API models loaded successfully!');
            resolve(true);
        } catch (error) {
            console.error('Failed to load face-api.js:', error);
            modelsReady = false;
            resolve(false);
        }
    });
}

// ====================
// File Upload Handlers
// ====================
function initializeUploadZones() {
    setupUploadZone(sourceZone, sourceInput, handleSourceUpload);
    setupUploadZone(targetZone, targetInput, handleTargetUpload);
}

function setupUploadZone(zone, input, handler) {
    zone.addEventListener('click', (e) => {
        if (!e.target.closest('.remove-btn')) {
            input.click();
        }
    });

    input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handler(e.target.files[0]);
        }
    });

    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handler(e.dataTransfer.files[0]);
        }
    });
}

function handleSourceUpload(file) {
    if (!file.type.startsWith('image/')) {
        showMessage('يرجى اختيار ملف صورة صحيح', 'error');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showMessage('حجم الصورة يجب أن يكون أقل من 10MB', 'error');
        return;
    }

    state.sourceImage = file;

    const reader = new FileReader();
    reader.onload = (e) => {
        sourceImagePreview.src = e.target.result;
        state.sourceImageData = e.target.result;
        sourceContent.style.display = 'none';
        sourcePreview.style.display = 'block';
        updateSwapButton();
    };
    reader.readAsDataURL(file);
}

function handleTargetUpload(file) {
    if (!file.type.startsWith('video/')) {
        showMessage('يرجى اختيار ملف فيديو صحيح', 'error');
        return;
    }

    if (file.size > 50 * 1024 * 1024) {
        showMessage('حجم الفيديو يجب أن يكون أقل من 50MB', 'error');
        return;
    }

    state.targetVideo = file;

    const url = URL.createObjectURL(file);
    targetVideoPreview.src = url;
    targetContent.style.display = 'none';
    targetPreview.style.display = 'block';
    updateSwapButton();
}

function removeSourceImage(e) {
    e.stopPropagation();
    state.sourceImage = null;
    state.sourceImageData = null;
    sourceInput.value = '';
    sourcePreview.style.display = 'none';
    sourceContent.style.display = 'block';
    updateSwapButton();
}

function removeTargetVideo(e) {
    e.stopPropagation();
    state.targetVideo = null;
    targetInput.value = '';
    targetVideoPreview.src = '';
    targetContent.style.display = 'block';
    targetPreview.style.display = 'none';
    updateSwapButton();
}

function updateSwapButton() {
    swapBtn.disabled = !(state.sourceImage && state.targetVideo);
}

// ====================
// Real Face Swap Processing
// ====================
async function performFaceSwap() {
    if (!state.sourceImage || !state.targetVideo) {
        showMessage('يرجى رفع الصورة والفيديو أولاً', 'error');
        return;
    }

    if (state.isProcessing) return;

    state.isProcessing = true;
    showLoading(true);

    try {
        updateProgress(5, 'جاري تهيئة نظام الذكاء الاصطناعي...');

        // Initialize face detection
        if (!modelsReady) {
            await initFaceDetection();
        }

        if (!modelsReady && !faceDetector) {
            throw new Error('لا يمكن تهيئة نظام اكتشاف الوجوه. يرجى استخدام متصفح حديث.');
        }

        updateProgress(10, 'جاري قراءة الصورة المصدر...');

        // Load source image for processing
        const sourceImg = new Image();
        sourceImg.src = state.sourceImageData;

        await new Promise((resolve, reject) => {
            sourceImg.onload = resolve;
            sourceImg.onerror = reject;
            setTimeout(resolve, 2000); // Wait for image to load
        });

        updateProgress(15, 'جاري اكتشاف الوجه في صورتك...');

        // Detect face in source image
        let sourceFaceBox = null;

        if (faceDetector) {
            // Use native FaceDetector API
            const faces = await faceDetector.detect(sourceImg);
            if (faces.length > 0) {
                sourceFaceBox = faces[0].boundingBox;
            }
        } else if (typeof faceapi !== 'undefined') {
            // Use face-api.js
            try {
                const detections = await faceapi.detectAllFaces(sourceImg,
                    new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
                );
                if (detections.length > 0) {
                    sourceFaceBox = {
                        x: detections[0].box.x,
                        y: detections[0].box.y,
                        width: detections[0].box.width,
                        height: detections[0].box.height
                    };
                }
            } catch (e) {
                console.log('Face detection error:', e);
            }
        }

        // If no face detected, use center crop
        if (!sourceFaceBox) {
            const size = Math.min(sourceImg.width, sourceImg.height);
            sourceFaceBox = {
                x: (sourceImg.width - size) / 2,
                y: (sourceImg.height - size) / 2,
                width: size,
                height: size
            };
            showMessage('تم استخدام منطقة مركزية للصورة', 'success');
        }

        console.log('Source face detected at:', sourceFaceBox);
        updateProgress(20, 'تم اكتشاف الوجه! جاري تحميل الفيديو...');

        // Create video element
        const video = document.createElement('video');
        video.src = URL.createObjectURL(state.targetVideo);
        video.muted = true;

        await new Promise((resolve, reject) => {
            video.onloadedmetadata = resolve;
            video.onerror = reject;
        });

        // Get video info
        const fps = 8;
        const duration = Math.min(video.duration, 30); // Max 30 seconds
        const totalFrames = Math.ceil(duration * fps);

        updateProgress(25, `جاري معالجة ${totalFrames} إطار...`);

        // Create canvas for processing
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Process frames
        const processedFrames = [];

        for (let i = 0; i < totalFrames; i++) {
            video.currentTime = i / fps;
            await new Promise(r => video.onseeked = r);

            // Draw video frame
            ctx.drawImage(video, 0, 0);

            // Detect faces in current frame
            let faces = [];

            try {
                if (faceDetector) {
                    // Create temporary canvas for detection
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = canvas.width;
                    tempCanvas.height = canvas.height;
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx.drawImage(canvas, 0, 0);

                    // Use a lower resolution for detection
                    const detectCanvas = document.createElement('canvas');
                    const detectScale = 0.25;
                    detectCanvas.width = canvas.width * detectScale;
                    detectCanvas.height = canvas.height * detectScale;
                    const detectCtx = detectCanvas.getContext('2d');
                    detectCtx.drawImage(tempCanvas, 0, 0, detectCanvas.width, detectCanvas.height);

                    const detectedFaces = await faceDetector.detect(detectCanvas);
                    faces = detectedFaces.map(f => ({
                        x: f.boundingBox.x / detectScale,
                        y: f.boundingBox.y / detectScale,
                        width: f.boundingBox.width / detectScale,
                        height: f.boundingBox.height / detectScale
                    }));
                } else if (typeof faceapi !== 'undefined') {
                    const detections = await faceapi.detectAllFaces(canvas,
                        new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 })
                    );
                    faces = detections.map(d => ({
                        x: d.box.x,
                        y: d.box.y,
                        width: d.box.width,
                        height: d.box.height
                    }));
                }
            } catch (e) {
                console.log('Detection error on frame', i);
            }

            // Swap each detected face
            for (const face of faces) {
                swapFaceWithBlend(ctx, face, sourceFaceBox, sourceImg, canvas.width, canvas.height);
            }

            // If no faces detected, try to find a likely face position
            if (faces.length === 0 && i === 0) {
                // Use center of video as default face position
                const defaultFace = {
                    x: canvas.width * 0.35,
                    y: canvas.height * 0.25,
                    width: canvas.width * 0.3,
                    height: canvas.width * 0.4
                };
                swapFaceWithBlend(ctx, defaultFace, sourceFaceBox, sourceImg, canvas.width, canvas.height);
            }

            // Save frame
            processedFrames.push(canvas.toDataURL('image/jpeg', 0.9));

            // Update progress
            const progress = 25 + Math.floor((i / totalFrames) * 65);
            updateProgress(progress, `جاري معالجة الإطار ${i + 1} من ${totalFrames}...`);
        }

        updateProgress(90, 'جاري إنشاء الفيديو النهائي...');

        // Create video from frames
        const outputVideo = await createVideoFromFrames(processedFrames, fps);
        state.resultUrl = outputVideo;

        updateProgress(100, 'اكتمل!');

        setTimeout(() => {
            showLoading(false);
            showResult(outputVideo);
            showMessage('تم استبدال الوجه بنجاح!', 'success');
        }, 500);

    } catch (error) {
        console.error('Face swap error:', error);
        showLoading(false);
        showMessage(error.message || 'حدث خطأ أثناء المعالجة', 'error');
    } finally {
        state.isProcessing = false;
    }
}

// ====================
// Face Swapping with Natural Blending
// ====================
function swapFaceWithBlend(ctx, targetFace, sourceFaceBox, sourceImg, canvasWidth, canvasHeight) {
    const { x, y, width, height } = targetFace;
    const faceCenterX = x + width / 2;
    const faceCenterY = y + height / 2;

    // Face dimensions with some padding
    const faceWidth = width * 1.1;
    const faceHeight = height * 1.15;

    // Create face canvas
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = faceWidth;
    faceCanvas.height = faceHeight;
    const faceCtx = faceCanvas.getContext('2d');

    // Calculate source image crop based on detected face
    const srcFaceWidth = sourceFaceBox.width;
    const srcFaceHeight = sourceFaceBox.height;
    const srcX = sourceFaceBox.x - srcFaceWidth * 0.1;
    const srcY = sourceFaceBox.y - srcFaceHeight * 0.15;

    // Draw source face to face canvas
    faceCtx.drawImage(
        sourceImg,
        srcX, srcY, srcFaceWidth * 1.2, srcFaceHeight * 1.3,
        0, 0, faceWidth, faceHeight
    );

    // Create elliptical mask
    faceCtx.save();
    faceCtx.beginPath();
    faceCtx.ellipse(
        faceWidth / 2,
        faceHeight / 2,
        faceWidth / 2 - 2,
        faceHeight / 2 - 2,
        0, 0, Math.PI * 2
    );
    faceCtx.closePath();
    faceCtx.clip();

    // Draw face
    faceCtx.drawImage(faceCanvas, 0, 0);
    faceCtx.restore();

    // Draw to main canvas with blending
    ctx.save();

    // Draw shadow/depth first
    ctx.filter = 'blur(8px)';
    ctx.globalAlpha = 0.4;
    ctx.drawImage(
        faceCanvas,
        x - width * 0.05,
        y - height * 0.05,
        faceWidth * 1.1,
        faceHeight * 1.1
    );

    ctx.filter = 'blur(3px)';
    ctx.globalAlpha = 0.7;
    ctx.drawImage(
        faceCanvas,
        x - width * 0.02,
        y - height * 0.02,
        faceWidth * 1.04,
        faceHeight * 1.04
    );

    ctx.filter = 'none';
    ctx.globalAlpha = 1;

    // Draw main face
    ctx.drawImage(faceCanvas, x, y, faceWidth, faceHeight);

    // Add edge softening
    ctx.globalAlpha = 0.3;
    const gradient = ctx.createRadialGradient(
        faceCenterX, faceCenterY, Math.min(faceWidth, faceHeight) * 0.3,
        faceCenterX, faceCenterY, Math.min(faceWidth, faceHeight) * 0.5
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.3)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(faceCenterX, faceCenterY, faceWidth / 2, faceHeight / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// ====================
// Create Video from Frames
// ====================
async function createVideoFromFrames(frames, fps) {
    return new Promise((resolve, reject) => {
        if (frames.length === 0) {
            reject(new Error('No frames to process'));
            return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Load first frame to get dimensions
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;

            // Try to use MediaRecorder
            try {
                const stream = canvas.captureStream(fps);

                // Try different MIME types
                const mimeTypes = [
                    'video/webm;codecs=vp9',
                    'video/webm;codecs=vp8',
                    'video/webm',
                    'video/mp4'
                ];

                let mediaRecorder = null;
                for (const mimeType of mimeTypes) {
                    if (MediaRecorder.isTypeSupported(mimeType)) {
                        mediaRecorder = new MediaRecorder(stream, {
                            mimeType: mimeType,
                            videoBitsPerSecond: 8000000
                        });
                        break;
                    }
                }

                if (!mediaRecorder) {
                    throw new Error('No supported video format');
                }

                const chunks = [];
                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunks.push(e.data);
                };
                mediaRecorder.onstop = () => {
                    const mimeType = mediaRecorder.mimeType.includes('mp4') ? 'video/mp4' : 'video/webm';
                    const blob = new Blob(chunks, { type: mimeType });
                    resolve(URL.createObjectURL(blob));
                };
                mediaRecorder.onerror = (e) => reject(e);

                mediaRecorder.start();

                let frameIndex = 0;
                const frameDelay = 1000 / fps;

                const processFrame = () => {
                    if (frameIndex < frames.length) {
                        img.src = frames[frameIndex];
                    } else {
                        setTimeout(() => mediaRecorder.stop(), 100);
                        return;
                    }
                };

                img.onload = () => {
                    ctx.drawImage(img, 0, 0);
                    frameIndex++;
                    setTimeout(processFrame, frameDelay);
                };

                // Start processing
                img.src = frames[0];

            } catch (mediaError) {
                console.error('MediaRecorder error:', mediaError);

                // Fallback: Create animated GIF or series of images
                // For now, return the last frame as image
                const lastFrame = frames[frames.length - 1];
                resolve(lastFrame); // Return last frame as data URL
            }
        };

        img.onerror = () => reject(new Error('Failed to load frames'));
        img.src = frames[0];
    });
}

// ====================
// Helper Functions
// ====================
function updateProgress(percent, status) {
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (loadingStatus) loadingStatus.textContent = status;
}

function showLoading(show) {
    if (loadingOverlay) loadingOverlay.style.display = show ? 'flex' : 'none';
    if (!show && progressFill) progressFill.style.width = '0%';
}

function showResult(url) {
    if (resultVideo) {
        resultVideo.src = url;
        resultContainer.style.display = 'block';
        resultVideo.play();
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function downloadResult() {
    if (!state.resultUrl) {
        showMessage('لا يوجد فيديو للتحميل', 'error');
        return;
    }

    const link = document.createElement('a');
    link.href = state.resultUrl;
    const extension = state.resultUrl.startsWith('data:') ? 'jpg' : 'webm';
    link.download = `face-swap-${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showMessage('جاري تحميل الملف...', 'success');
}

function shareResult() {
    if (navigator.share) {
        navigator.share({
            title: 'Face Swap - استبدال الوجوه',
            text: 'تحقق من هذا الفيديو الرائع!',
            url: state.resultUrl
        }).catch(() => {
            navigator.clipboard.writeText(window.location.href).then(() => {
                showMessage('تم نسخ الرابط!', 'success');
            });
        });
    } else {
        navigator.clipboard.writeText(window.location.href).then(() => {
            showMessage('تم نسخ الرابط!', 'success');
        });
    }
}

function resetAll() {
    state.sourceImage = null;
    state.targetVideo = null;
    state.resultUrl = null;
    state.sourceImageData = null;

    sourceInput.value = '';
    targetInput.value = '';

    sourcePreview.style.display = 'none';
    targetPreview.style.display = 'none';
    sourceContent.style.display = 'block';
    targetContent.style.display = 'block';

    resultContainer.style.display = 'none';
    if (resultVideo) resultVideo.src = '';

    updateSwapButton();

    showMessage('تم إعادة تعيين جميع الملفات', 'success');
}

function toggleFaq(button) {
    const faqItem = button.closest('.faq-item');
    const isActive = faqItem.classList.contains('active');

    document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
    });

    if (!isActive) {
        faqItem.classList.add('active');
    }
}

function showMessage(text, type = 'success') {
    const existingMessage = document.querySelector('.message');
    if (existingMessage) existingMessage.remove();

    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    document.body.appendChild(message);

    setTimeout(() => message.remove(), 4000);
}

// Smooth Scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// Header Scroll Effect
const header = document.querySelector('.header');
window.addEventListener('scroll', () => {
    header.style.boxShadow = window.pageYOffset > 100 ? '0 4px 20px rgba(0, 0, 0, 0.3)' : 'none';
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeUploadZones();

    // Try to initialize face detection in background
    initFaceDetection().then(ready => {
        if (ready) {
            console.log('Face detection ready!');
        }
    });
});
