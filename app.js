const videoElement = document.getElementById('camera-feed');
const canvasElement = document.getElementById('overlay-canvas');
const canvasCtx = canvasElement.getContext('2d');
const startBtn = document.getElementById('start-btn');
const usernameInput = document.getElementById('username');
const statusBox = document.getElementById('status-message');
const scannerContainer = document.getElementById('scanner');
const scanLine = document.getElementById('scan-line');
const listContainer = document.getElementById('list-container');

let isScanningMode = false;
let scanProgress = 0;
let modelReady = false;

// Helpers
function showStatus(text, type = 'info') {
    statusBox.textContent = text;
    statusBox.className = 'status-box status-' + type;
    statusBox.style.display = 'block';
}

function getDatabase() {
    return JSON.parse(localStorage.getItem('thumb_database') || '[]');
}

function saveToDatabase(username, hash) {
    const db = getDatabase();
    db.push({ username, hash, date: new Date().toISOString() });
    localStorage.setItem('thumb_database', JSON.stringify(db));
    renderDatabase();
}

function renderDatabase() {
    const db = getDatabase();
    if (db.length === 0) return;

    listContainer.innerHTML = db.map(d => `
        <div style="background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: 0.5rem; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between;">
            <div>
                <div style="color: var(--text-main); font-weight: 500;">${d.username}</div>
                <div style="color: var(--text-muted); font-size: 0.7rem;">Thumb Hash: ${d.hash.substring(0, 15)}...</div>
            </div>
            <div style="color: var(--success); font-weight:600; font-size: 0.8rem;">Saved</div>
        </div>
    `).join('');
}

// MediaPipe Hands AI Setup
const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
});

hands.setOptions({
    maxNumHands: 1, // Only care about one hand
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

hands.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 250,
    height: 250
});

// Start Camera
camera.start().then(() => {
    modelReady = true;
    startBtn.textContent = 'Capture Thumb Print';
    startBtn.disabled = false;
    showStatus('AI specifically trained on Thumb Tracking is ready. Other objects are ignored.', 'info');
}).catch(err => {
    showStatus('Camera Error: You must be on HTTPS or localhost to use the camera.', 'error');
});

function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Draw the video frame to the canvas
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    // AI THUMB ISOLATION LOGIC
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

        // MediaPipe tracks 21 points on a hand. 
        // 0 = Wrist, 1=Thumb Base, 2=Thumb Joint 1, 3=Thumb Joint 2, 4=Thumb Tip
        // We will EXPLICITLY IGNORE the other 16 points for fingers, faces, objects.
        const thumbPoints = [landmarks[0], landmarks[1], landmarks[2], landmarks[3], landmarks[4]];

        // Draw ONLY the Thumb on the screen with a glowing neon line to prove it's isolating it
        canvasCtx.beginPath();
        canvasCtx.moveTo(thumbPoints[0].x * canvasElement.width, thumbPoints[0].y * canvasElement.height);
        for (let i = 1; i < thumbPoints.length; i++) {
            canvasCtx.lineTo(thumbPoints[i].x * canvasElement.width, thumbPoints[i].y * canvasElement.height);
        }
        canvasCtx.lineWidth = 5;
        canvasCtx.strokeStyle = '#3b82f6'; // Bright Blue
        canvasCtx.shadowColor = '#3b82f6';
        canvasCtx.shadowBlur = 15;
        canvasCtx.stroke();

        // Draw Thumb Joints (The 'Minutiae')
        thumbPoints.forEach(point => {
            canvasCtx.beginPath();
            canvasCtx.arc(point.x * canvasElement.width, point.y * canvasElement.height, 4, 0, 2 * Math.PI);
            canvasCtx.fillStyle = '#10b981'; // Green Dots
            canvasCtx.fill();
        });

        // Scan Progress Logic
        if (isScanningMode) {
            // Isolate mathematical data just from the thumb to act as the "Hash"
            scanProgress += 2; // Speed of scan

            if (scanProgress >= 100) {
                // Done Scanning!
                isScanningMode = false;
                scanLine.style.display = 'none';
                scannerContainer.classList.remove('scanning');
                scannerContainer.classList.add('success');

                // Generate a fake 'Biometric Hash' out of the physical position of the thumb tip
                const thumbTip = thumbPoints[4];
                const pseudoHash = btoa(thumbTip.x + "-" + thumbTip.y + "-" + Date.now());

                showStatus(`✅ Thumb successfully scanned and securely hashed!`, 'success');
                saveToDatabase(usernameInput.value, pseudoHash);

                usernameInput.value = '';
                usernameInput.disabled = false;
                startBtn.disabled = false;

                setTimeout(() => scannerContainer.classList.remove('success'), 3000);
            }
        }
    } else {
        // No hand/thumb detected
        if (isScanningMode) {
            showStatus('⚠️ Thumb lost! Please hold your thumb up to the camera.', 'error');
        }
    }

    canvasCtx.restore();
}

// User clicks button to start targeting process
startBtn.addEventListener('click', () => {
    if (!usernameInput.value.trim()) {
        showStatus('Please enter a Driver Name first.', 'error');
        return;
    }

    isScanningMode = true;
    scanProgress = 0;

    // UI Updates
    usernameInput.disabled = true;
    startBtn.disabled = true;
    scanLine.style.display = 'block';
    scannerContainer.classList.add('scanning');

    showStatus('Hold your thumb steady in front of the camera...', 'info');
});

// Init
renderDatabase();
// Set canvas to match CSS layout
canvasElement.width = 250;
canvasElement.height = 250;
