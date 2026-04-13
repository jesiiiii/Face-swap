// ====================
// Face Swap Application - Cloudinary Version
// ====================

const API_BASE = ''; // Leave empty to use same server

const state = {
    sourceImage: null,
    targetVideo: null,
    isProcessing: false,
    resultUrl: null
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

// ====================
// File Upload
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

    state.sourceImage = file;

    const reader = new FileReader();
    reader.onload = (e) => {
        sourceImagePreview.src = e.target.result;
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
// Face Swap Processing - Cloudinary API
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
        updateProgress(5, 'جاري تهيئة الاتصال...');

        // Create form data
        const formData = new FormData();
        formData.append('sourceImage', state.sourceImage);
        formData.append('targetVideo', state.targetVideo);

        updateProgress(10, 'جاري رفع الملفات إلى Cloudinary...');

        // Send to backend for Cloudinary processing
        const response = await fetch(`${API_BASE}/api/face-swap`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'حدث خطأ أثناء المعالجة');
        }

        updateProgress(80, 'جاري إكمال المعالجة...');

        state.resultUrl = data.result.videoUrl;

        updateProgress(100, 'اكتمل!');

        setTimeout(() => {
            showLoading(false);
            showResult(data.result.videoUrl);
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
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function downloadResult() {
    if (!state.resultUrl) {
        showMessage('لا يوجد فيديو للتحميل', 'error');
        return;
    }

    // Open in new tab for download
    window.open(state.resultUrl, '_blank');
    showMessage('جاري تحميل الفيديو...', 'success');
}

function shareResult() {
    if (navigator.share) {
        navigator.share({
            title: 'Face Swap - استبدال الوجوه',
            text: 'تحقق من هذا الفيديو!',
            url: state.resultUrl
        });
    } else {
        navigator.clipboard.writeText(state.resultUrl);
        showMessage('تم نسخ رابط الفيديو!', 'success');
    }
}

function resetAll() {
    state.sourceImage = null;
    state.targetVideo = null;
    state.resultUrl = null;

    sourceInput.value = '';
    targetInput.value = '';

    sourcePreview.style.display = 'none';
    targetPreview.style.display = 'none';
    sourceContent.style.display = 'block';
    targetContent.style.display = 'block';

    resultContainer.style.display = 'none';
    if (resultVideo) resultVideo.src = '';

    updateSwapButton();
    showMessage('تم إعادة تعيين', 'success');
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
    const existing = document.querySelector('.message');
    if (existing) existing.remove();

    const msg = document.createElement('div');
    msg.className = `message ${type}`;
    msg.textContent = text;
    document.body.appendChild(msg);

    setTimeout(() => msg.remove(), 4000);
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeUploadZones();
});
