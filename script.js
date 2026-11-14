let uploadedImage = null;
let audioContext = null;
let playheadInterval = null;
let visualizerInterval = null;
let isPlaying = false;
let isMuted = false;
let isPanelOpen = true;
let isWaitingForVoice = false; 
let liveMalaysiaData = null; 
let isRawScientific = false; 

const datasets = [
    { name: "SST Anomalies", color1: "#00D2FF", color2: "#FF6B35" },
    { name: "Arctic Sea Ice Extent", color1: "#E2E8F0", color2: "#1E3A8A" },
    { name: "Atmospheric CO2", color1: "#FF6B35", color2: "#7F1D1D" },
    { name: "Global Wildfire Hotspots", color1: "#FBBF24", color2: "#DC2626" },
    { name: "Live Malaysia Weather", color1: "#00D2FF", color2: "#00FF88" }
];
let currentDatasetIndex = 0;

window.onload = () => {
    document.getElementById("playButton").disabled = false; 
    updateImage(0); 
};

// ==================================
// Audio Narration
// ==================================
function speakTextPromise(text) {
    return new Promise((resolve) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); 
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.1;
            utterance.onend = () => resolve();
            utterance.onerror = () => resolve(); 
            window.speechSynthesis.speak(utterance);
        } else {
            resolve(); 
        }
    });
}

// ==================================
// Live Malaysia EIC API
// ==================================
async function fetchLiveMalaysiaData() {
    try {
        const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=3.1390&longitude=101.6869&current_weather=true");
        const data = await res.json();
        liveMalaysiaData = {
            temp: data.current_weather.temperature,
            wind: data.current_weather.windspeed
        };
        document.getElementById("tempVal").textContent = `+${liveMalaysiaData.temp.toFixed(1)}°C`;
        document.getElementById("liveNarration").textContent = `Live Malaysia (KL): Temp ${liveMalaysiaData.temp}°C, Wind ${liveMalaysiaData.wind} km/h.`;
    } catch (e) {
        liveMalaysiaData = { temp: 30.0, wind: 5.0 }; 
    }
}

// ==================================
// Mode Switching
// ==================================
function switchMode(mode) {
    const btnHarmonic = document.getElementById("btnHarmonic");
    const btnRaw = document.getElementById("btnRaw");
    
    if (mode === 'raw') {
        isRawScientific = true;
        btnRaw.classList.add("active");
        btnHarmonic.classList.remove("active");
        document.getElementById("liveNarration").textContent = "Switched to Raw Scientific Mode. Note: This mode is simulated for the demo.";
    } else {
        isRawScientific = false;
        btnHarmonic.classList.add("active");
        btnRaw.classList.remove("active");
        document.getElementById("liveNarration").textContent = "Switched to Musical Harmonic Mode.";
    }
}

// ==================================
// Dataset Visuals & Uploads
// ==================================
function updateImage(index) {
    stopSound();
    currentDatasetIndex = index;
    const ds = datasets[index];
    
    if (index === 4) {
        fetchLiveMalaysiaData();
    } else {
        document.getElementById("tempVal").textContent = "+1.84°C";
    }

    const canvas = document.getElementById("mainVisualCanvas");
    canvas.width = 800; canvas.height = 450;
    const ctx = canvas.getContext("2d");
    
    ctx.fillStyle = "#0B0E14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(canvas.width / 2, canvas.height / 2, 300, 180, 0, 0, Math.PI * 2);
    ctx.clip();
    
    const c1 = index === 4 ? "#FF6B35" : ds.color1;
    const c2 = index === 4 ? "#FF0000" : ds.color2;
    
    const grad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 50, canvas.width / 2, canvas.height / 2, 300);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    
    uploadedImage = canvas;
    resizePlayheadCanvas();
    
    if (index !== 4) {
        document.getElementById("liveNarration").textContent = `Loaded dataset: ${ds.name}`;
    }
    
    resetTelemetryUI();
    document.querySelectorAll('.pill').forEach((p, i) => {
        p.classList.toggle('active', i === index);
    });
}

function handleUserUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        stopSound();
        const img = new Image();
        img.onload = () => {
            const canvas = document.getElementById("mainVisualCanvas");
            canvas.width = 800; canvas.height = 450;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#000"; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            uploadedImage = canvas;
            resizePlayheadCanvas();
            resetTelemetryUI();
            
            document.getElementById("liveNarration").textContent = "Custom image uploaded successfully. Press Play.";
            document.getElementById("tempVal").textContent = "Custom";
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function resetTelemetryUI() {
    document.getElementById("freqVal").textContent = "0.00 Hz";
    document.getElementById("pitchBar").style.width = "0%";
    document.getElementById("dbVal").textContent = "-∞ dB";
    document.getElementById("vuMeter").style.width = "0%";
    document.getElementById("panVal").textContent = "Center";
    document.getElementById("panKnob").style.left = "50%";
}

function resizePlayheadCanvas() {
    const mainCanvas = document.getElementById("mainVisualCanvas");
    const playCanvas = document.getElementById("playheadCanvas");
    const waveCanvas = document.getElementById("waveformCanvas");
    playCanvas.width = mainCanvas.width; playCanvas.height = mainCanvas.height;
    waveCanvas.width = mainCanvas.width; waveCanvas.height = mainCanvas.height;
}

function changeDataset(direction) {
    let newIndex = currentDatasetIndex + direction;
    if (newIndex >= datasets.length) newIndex = 0;
    if (newIndex < 0) newIndex = datasets.length - 1;
    updateImage(newIndex);
}

// ==================================
// Keyboard Shortcuts & Accessibility
// ==================================
function toggleHighContrast() { document.body.classList.toggle("high-contrast"); }

function showShortcuts() { 
    speakTextPromise("Keyboard shortcuts. Space to play or stop. M to mute. H for high contrast. 1 to 5 to switch datasets.").then(() => {
        document.getElementById("liveNarration").textContent = "Shortcuts: [SPACE] Play/Stop, [M] Mute, [H] High Contrast, [1-5] Datasets.";
    });
}

document.addEventListener('keydown', function(e) {
    if (e.code === 'Space') {
        e.preventDefault(); 
        if (isPlaying) {
            stopSound();
        } else if (!isWaitingForVoice) { 
            togglePlay();
        }
    }
    if (e.key.toLowerCase() === 'm') toggleMute();
    if (e.key.toLowerCase() === 'h') toggleHighContrast();
    if (e.key === 'Escape') stopSound();
    
    const num = parseInt(e.key);
    if (num >= 1 && num <= datasets.length) {
        updateImage(num - 1);
        const dsName = datasets[num - 1].name;
        let desc = `Switched to ${dsName}.`;
        if (num === 1) desc += " Red colors represent high sea surface temperatures.";
        if (num === 2) desc += " White and blue represent melting sea ice.";
        if (num === 3) desc += " Dark red represents high atmospheric carbon dioxide.";
        if (num === 4) desc += " Bright orange represents active wildfires.";
        if (num === 5) desc += " Live weather data from Malaysia.";
        
        speakTextPromise(desc); 
    }
});

// ==================================
// Playback Logic
// ==================================
function togglePlay() {
    if (isPlaying) {
        stopSound();
    } else {
        playSound();
    }
}

async function playSound() {
    if (!uploadedImage || isWaitingForVoice) return;
    stopSound(); 
    isWaitingForVoice = true;
    
    const introText = `Starting audio sonification for ${datasets[currentDatasetIndex].name}.`;
    document.getElementById("liveNarration").textContent = introText;
    
    await speakTextPromise(introText);
    isWaitingForVoice = false; 

    isPlaying = true;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioContext) audioContext = new AudioContext();
    if (audioContext.state === 'suspended') audioContext.resume();

    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    tempCanvas.width = 40; tempCanvas.height = 20;
    tempCtx.drawImage(uploadedImage, 0, 0, 40, 20);
    const imageData = tempCtx.getImageData(0, 0, 40, 20).data;

    const playCanvas = document.getElementById("playheadCanvas");
    const playCtx = playCanvas.getContext("2d");
    const columnWidth = playCanvas.width / 40;
    let currentColumn = 0;
    
    const speedMultiplier = parseFloat(document.getElementById("speedSelect").value);
    const baseInterval = 100 / speedMultiplier; 

    const playBtn = document.getElementById("playButton");
    playBtn.innerHTML = "⏸"; 
    playBtn.style.background = "var(--accent-coral)";
    playBtn.style.boxShadow = "0 0 15px rgba(255, 107, 53, 0.5)";

    startVisualizer();

    playheadInterval = setInterval(() => {
        if (currentColumn >= 40) {
            stopSound();
            return;
        }

        playCtx.clearRect(0, 0, playCanvas.width, playCanvas.height); 
        playCtx.beginPath();
        playCtx.moveTo(currentColumn * columnWidth, 0);
        playCtx.lineTo(currentColumn * columnWidth, playCanvas.height);
        
        // WHITE PLAYHEAD LINE
        playCtx.strokeStyle = "#FFFFFF";
        playCtx.lineWidth = 3; 
        playCtx.stroke();

        document.getElementById("timelineScrubber").value = (currentColumn / 40) * 100;

        let r = 0, g = 0, b = 0;
        let dataDensity = 0; 

        for (let row = 0; row < 20; row++) {
            let index = (row * 40 + currentColumn) * 4;
            let pixelBrightness = (imageData[index] + imageData[index + 1] + imageData[index + 2]) / 3;
            r += imageData[index]; g += imageData[index + 1]; b += imageData[index + 2];
            if (pixelBrightness > 30) dataDensity++;
        }
        r /= 20; g /= 20; b /= 20;
        const avgBrightness = (r + g + b) / 3;
        const volume = isMuted ? 0 : document.getElementById("volume").value / 100;

        if (avgBrightness > 25) { 
            const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; 
            let warmth = r / (b + 1); 
            let noteIndex = Math.floor(warmth * 2); 
            
            if (currentDatasetIndex === 4 && liveMalaysiaData) {
                noteIndex = Math.round((liveMalaysiaData.temp - 25) / 2); 
            }
            
            noteIndex = Math.max(0, Math.min(noteIndex, pentatonic.length - 1));
            
            const densityVolume = (dataDensity / 20) * 0.8; 
            
            const oscType = isRawScientific ? "sawtooth" : (avgBrightness > 120 ? "triangle" : "sine");

            const osc = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            osc.type = oscType; 
            osc.frequency.setValueAtTime(pentatonic[noteIndex], audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(densityVolume * volume, audioContext.currentTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.25);

            osc.connect(gainNode); 
            gainNode.connect(audioContext.destination);
            osc.start(); 
            osc.stop(audioContext.currentTime + 0.25);

            document.getElementById("freqVal").textContent = pentatonic[noteIndex].toFixed(2) + " Hz";
            document.getElementById("pitchBar").style.width = ((noteIndex + 1) / 6 * 100) + "%";
            document.getElementById("vuMeter").style.width = (densityVolume * 100) + "%";
            document.getElementById("dbVal").textContent = (-10 + (densityVolume * 10)).toFixed(1) + " dB";
        }
        currentColumn++;
    }, baseInterval); 
}

function stopSound() {
    isPlaying = false;
    isWaitingForVoice = false; 
    if (playheadInterval) { clearInterval(playheadInterval); playheadInterval = null; }
    if (visualizerInterval) { clearInterval(visualizerInterval); visualizerInterval = null; }
    if (audioContext && audioContext.state !== 'closed') { audioContext.close(); audioContext = null; }
    
    const playCanvas = document.getElementById("playheadCanvas");
    const playCtx = playCanvas.getContext("2d");
    playCtx.clearRect(0, 0, playCanvas.width, playCanvas.height);
    
    const waveCanvas = document.getElementById("waveformCanvas");
    const waveCtx = waveCanvas.getContext("2d");
    waveCtx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);

    const playBtn = document.getElementById("playButton");
    playBtn.innerHTML = "▶";
    playBtn.style.background = "var(--accent-cyan)";
    playBtn.style.boxShadow = "0 0 15px rgba(0, 210, 255, 0.3)";
    
    document.getElementById("vuMeter").style.width = "0%";
}

function startVisualizer() {
    const waveCanvas = document.getElementById("waveformCanvas");
    const ctx = waveCanvas.getContext("2d");
    let offset = 0;

    visualizerInterval = setInterval(() => {
        if (!isPlaying) return;
        
        ctx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
        ctx.beginPath();
        ctx.strokeStyle = "rgba(0, 210, 255, 0.5)";
        ctx.lineWidth = 2;

        for (let i = 0; i < waveCanvas.width; i += 5) {
            let y = waveCanvas.height / 2 + Math.sin(i * 0.05 + offset) * 30;
            if (i === 0) ctx.moveTo(i, y);
            else ctx.lineTo(i, y);
        }
        ctx.stroke();
        offset += 0.2;

        let panLeft = 50 + (Math.random() * 4 - 2);
        document.getElementById("panKnob").style.left = panLeft + "%";
    }, 50);
}

function toggleMute() {
    isMuted = !isMuted;
    document.getElementById("muteIcon").textContent = isMuted ? "🔇" : "🔊";
}

function togglePanel() {
    isPanelOpen = !isPanelOpen;
    const content = document.querySelector(".panel-content");
    const icon = document.querySelector(".toggle-icon");
    content.style.display = isPanelOpen ? "block" : "none";
    icon.textContent = isPanelOpen ? "▼" : "▲";
}
