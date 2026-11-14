// ==================================
// Global Variables
// ==================================
let uploadedImage = null;
let audioContext = null;
let playheadInterval = null;

// ==================================
// Navigation & Image Upload
// ==================================
function goToExplorer() {
    document.getElementById("explorer").scrollIntoView({ behavior: "smooth" });
}

function previewImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return alert("Please select a valid image.");

    const imageURL = URL.createObjectURL(file);
    const preview = document.getElementById("imagePreview");

    preview.onload = function () {
        uploadedImage = preview;
        preview.style.display = "inline-block"; 
        enableControls();
        resizePlayheadCanvas();
        
        document.getElementById("status").textContent = "Image uploaded successfully! Ready to play.";
        document.getElementById("soundDescription").textContent = "Press 'Play' to hear the image.";
    };
    preview.src = imageURL;
}

function loadDemoImage() {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 500;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(canvas.width / 2, canvas.height / 2, 300, 200, 0, 0, Math.PI * 2);
    ctx.clip();

    let grad1 = ctx.createRadialGradient(200, 250, 50, 200, 250, 400);
    grad1.addColorStop(0, "#00ff00");
    grad1.addColorStop(1, "#0000ff");
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let grad2 = ctx.createRadialGradient(600, 200, 20, 600, 200, 300);
    grad2.addColorStop(0, "#ff0000");
    grad2.addColorStop(1, "transparent");
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    const preview = document.getElementById("imagePreview");
    preview.onload = function() {
        uploadedImage = preview;
        preview.style.display = "inline-block";
        enableControls();
        resizePlayheadCanvas();
        
        document.getElementById("status").textContent = "Demo pattern loaded! Press 'Play'.";
        document.getElementById("soundDescription").textContent = "Ready to play demo.";
    };
    preview.src = canvas.toDataURL();
}

function enableControls() {
    document.getElementById("playButton").disabled = false;
    document.getElementById("stopButton").disabled = false;
}

function resizePlayheadCanvas() {
    const img = document.getElementById("imagePreview");
    const canvas = document.getElementById("playheadCanvas");
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;
}

// ==================================
// NEW: Fetch Latest Earth from NASA EPIC (Blob Method)
// ==================================
function fetchEpicEarth() {
    const status = document.getElementById("status");
    status.textContent = "Contacting NASA satellites...";

    const apiKey = "DEMO_KEY"; 
    const url = `https://api.nasa.gov/EPIC/api/natural?api_key=${apiKey}`;

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error("NASA API returned an error.");
            return response.json();
        })
        .then(data => {
            if (data.length === 0) {
                status.textContent = "No recent Earth images available from EPIC.";
                return;
            }

            const latest = data[0];
            const dateStr = latest.date.split(" ")[0]; 
            const [year, month, day] = dateStr.split("-");
            const imageName = latest.image;

            const imageUrl = `https://epic.gsfc.nasa.gov/archive/natural/${year}/${month}/${day}/png/${imageName}.png`;

            status.textContent = `Loading Earth image from ${dateStr}...`;

            fetch(imageUrl)
                .then(res => {
                    if (!res.ok) throw new Error("Could not download the image.");
                    return res.blob();
                })
                .then(blob => {
                    const localUrl = URL.createObjectURL(blob);
                    const preview = document.getElementById("imagePreview");
                    
                    preview.onload = function() {
                        uploadedImage = preview;
                        preview.style.display = "inline-block";
                        enableControls();
                        resizePlayheadCanvas();
                        
                        status.textContent = `Latest Earth image loaded (${dateStr}). Press 'Play' to hear it!`;
                        document.getElementById("soundDescription").textContent = "Ready to sonify the real Earth.";
                    };
                    
                    preview.src = localUrl;
                })
                .catch(err => {
                    console.error("Blob fetch error:", err);
                    status.textContent = "NASA blocked the image download. Please upload a local image instead.";
                });
        })
        .catch(error => {
            console.error("EPIC API error:", error);
            status.textContent = "Could not reach NASA. Check your internet connection.";
        });
}

// ==================================
// Sonification Engine (Updated for Task Requirements)
// ==================================
function playSound() {
    if (!uploadedImage) return;
    stopSound(); 

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioContext) audioContext = new AudioContext();
    if (audioContext.state === 'suspended') audioContext.resume();

    const canvas = document.getElementById("imageCanvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 40; canvas.height = 20;
    ctx.drawImage(uploadedImage, 0, 0, 40, 20);
    
    let imageData;
    try {
        imageData = ctx.getImageData(0, 0, 40, 20).data;
    } catch (e) {
        alert("Unable to read image pixels. Please use the 'Choose an Image' button to upload a local file.");
        return;
    }

    const playCanvas = document.getElementById("playheadCanvas");
    const playCtx = playCanvas.getContext("2d");
    const columnWidth = playCanvas.width / 40;
    let currentColumn = 0;
    const volumeSlider = document.getElementById("volume").value / 100;

    document.getElementById("playButton").disabled = true;
    document.getElementById("soundDescription").textContent = "Playing... sweeping left to right.";

    // Create a master volume node for the whole soundscape
    const masterGain = audioContext.createGain();
    masterGain.gain.value = volumeSlider;
    masterGain.connect(audioContext.destination);

    playheadInterval = setInterval(() => {
        if (currentColumn >= 40) {
            stopSound();
            document.getElementById("soundDescription").textContent = "Playback finished.";
            return;
        }

        // 1. Visual Playhead
        playCtx.clearRect(0, 0, playCanvas.width, playCanvas.height); 
        playCtx.beginPath();
        playCtx.moveTo(currentColumn * columnWidth, 0);
        playCtx.lineTo(currentColumn * columnWidth, playCanvas.height);
        playCtx.strokeStyle = "#B8E986";
        playCtx.lineWidth = 3; 
        playCtx.stroke();

        // 2. Analyze the Column (Color, Brightness, Density)
        let r = 0, g = 0, b = 0;
        let dataDensity = 0; // How much of the column is not black

        for (let row = 0; row < 20; row++) {
            let index = (row * 40 + currentColumn) * 4;
            let pixelBrightness = (imageData[index] + imageData[index + 1] + imageData[index + 2]) / 3;
            
            r += imageData[index]; 
            g += imageData[index + 1]; 
            b += imageData[index + 2];

            if (pixelBrightness > 30) dataDensity++;
        }
        r /= 20; g /= 20; b /= 20;
        const avgBrightness = (r + g + b) / 3;

        // 3. Map to Audio Parameters
        if (avgBrightness > 25) { 
            // PENTATONIC SCALE (Always sounds musical)
            const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; 
            
            // MAPPING: Warmth (Red vs Blue) -> Pitch
            let warmth = r / (b + 1); 
            let noteIndex = Math.floor(warmth * 2); 
            noteIndex = Math.max(0, Math.min(noteIndex, pentatonic.length - 1));
            
            // MAPPING: Pixel Density -> Volume (Loudness)
            // If the column is full of data, it plays louder.
            const densityVolume = (dataDensity / 20) * 0.8; 

            // MAPPING: Brightness -> Instrumentation (Oscillator Type)
            // Darker areas sound smooth (sine), brighter areas sound sharper (triangle)
            const oscType = avgBrightness > 120 ? "triangle" : "sine";

            // Main Melody Note
            const osc = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            osc.type = oscType; 
            osc.frequency.setValueAtTime(pentatonic[noteIndex], audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(densityVolume, audioContext.currentTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.25);

            osc.connect(gainNode); 
            gainNode.connect(masterGain);
            osc.start(); 
            osc.stop(audioContext.currentTime + 0.25);

            // Harmonic Bass Drone (Plays on every 5th column for a rhythm)
            if (currentColumn % 5 === 0) {
                const bassOsc = audioContext.createOscillator();
                const bassGain = audioContext.createGain();
                bassOsc.type = "sine";
                // Bass note is one octave lower than the melody
                bassOsc.frequency.setValueAtTime(pentatonic[0] / 2, audioContext.currentTime);
                
                bassGain.gain.setValueAtTime(0, audioContext.currentTime);
                bassGain.gain.linearRampToValueAtTime(densityVolume * 1.5, audioContext.currentTime + 0.1);
                bassGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4);

                bassOsc.connect(bassGain);
                bassGain.connect(masterGain);
                bassOsc.start();
                bassOsc.stop(audioContext.currentTime + 0.4);
            }
        }
        currentColumn++;
    }, 100); 
}

function stopSound() {
    if (playheadInterval) { clearInterval(playheadInterval); playheadInterval = null; }
    if (audioContext && audioContext.state !== 'closed') { audioContext.close(); audioContext = null; }
    const playCanvas = document.getElementById("playheadCanvas");
    const playCtx = playCanvas.getContext("2d");
    playCtx.clearRect(0, 0, playCanvas.width, playCanvas.height);
    if (uploadedImage) {
        document.getElementById("playButton").disabled = false;
        document.getElementById("soundDescription").textContent = "Soundscape stopped.";
    }
}

// ==================================
// Real-Time Earth Data
// ==================================
function getLocation() {
    const resultsDiv = document.getElementById("earthDataResults");
    const locationName = document.getElementById("locationName");
    
    locationName.textContent = "Detecting your location...";
    resultsDiv.style.display = "block";
    document.getElementById("tempData").textContent = "--";
    document.getElementById("windData").textContent = "--";
    document.getElementById("airData").textContent = "--";

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
                    .then(res => res.json())
                    .then(data => {
                        const city = data.address.city || data.address.town || data.address.village || "Your Location";
                        const country = data.address.country || "";
                        locationName.textContent = `${city}, ${country}`;
                    })
                    .catch(() => locationName.textContent = "Your Current Location");
                
                fetchWeatherAndAir(lat, lon);
            },
            (error) => {
                alert("Unable to retrieve your location. Please allow location access or search for a city.");
                resultsDiv.style.display = "none";
            }
        );
    } else {
        alert("Geolocation is not supported by this browser.");
        resultsDiv.style.display = "none";
    }
}

function searchCity() {
    const city = document.getElementById("cityInput").value.trim();
    const country = document.getElementById("countryInput").value.trim();
    
    if (!city) return alert("Please enter a city name.");

    const searchQuery = country ? `${city}, ${country}` : city;
    const resultsDiv = document.getElementById("earthDataResults");
    const locationName = document.getElementById("locationName");
    
    locationName.textContent = `Searching for ${searchQuery}...`;
    resultsDiv.style.display = "block";

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`)
        .then(res => res.json())
        .then(data => {
            if (data.length === 0) {
                alert("Location not found. Please check your spelling.");
                resultsDiv.style.display = "none";
                return;
            }
            const lat = data[0].lat;
            const lon = data[0].lon;
            locationName.textContent = data[0].display_name.split(',')[0] + ", " + data[0].display_name.split(',').slice(-1)[0];
            fetchWeatherAndAir(lat, lon);
        })
        .catch(err => {
            console.error(err);
            alert("Error finding location.");
        });
}

function fetchWeatherAndAir(lat, lon) {
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`)
        .then(res => res.json())
        .then(data => {
            document.getElementById("tempData").textContent = data.current_weather.temperature + " °C";
            document.getElementById("windData").textContent = data.current_weather.windspeed + " km/h";
        })
        .catch(err => console.error("Weather error:", err));

    fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5`)
        .then(res => res.json())
        .then(data => {
            const pm25 = data.current.pm2_5;
            document.getElementById("airData").textContent = pm25 + " µg/m³";
        })
        .catch(err => console.error("Air Quality error:", err));
}