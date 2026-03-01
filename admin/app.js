/**
 * ============================================================================
 * MiTV Network - Master Studio Controller
 * Description: Handles dynamic assets (Video, Audio, Font, Logo) mapping
 * ============================================================================
 */

// 1. Firebase System Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBbnU8DkthpYQMHOLLyj6M0cc05qXfjMcw",
    authDomain: "ramadan-2385b.firebaseapp.com",
    databaseURL: "https://ramadan-2385b-default-rtdb.firebaseio.com",
    projectId: "ramadan-2385b",
    storageBucket: "ramadan-2385b.firebasestorage.app",
    messagingSenderId: "882828936310",
    appId: "1:882828936310:web:7f97b921031fe130fe4b57"
};

// Initialize App
let app, database;

try {
    app = firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    addLog("System initialized successfully.", "success");
} catch (error) {
    addLog(`Firebase Init Error: ${error.message}`, "error");
}

// 2. DOM Elements Mapping
const UI = {
    // Forms
    formMedia: document.getElementById('form-media'),
    formTypography: document.getElementById('form-typography'),
    
    // Inputs (Media)
    videoUrl: document.getElementById('videoUrl'),
    audioUrl: document.getElementById('audioUrl'),
    logoUrl: document.getElementById('logoUrl'),
    
    // Inputs (Typography & Text)
    fontUrl: document.getElementById('fontUrl'),
    tickerText: document.getElementById('tickerText'),
    weatherCity: document.getElementById('weatherCity'),
    
    // Controls
    masterToggle: document.getElementById('masterStreamToggle'),
    btnSync: document.getElementById('btn-force-sync'),
    
    // Diagnostics & UI
    dbStatusDot: document.getElementById('db-status-dot'),
    dbStatusText: document.getElementById('db-status-text'),
    diagVideo: document.getElementById('diag-video'),
    diagAudio: document.getElementById('diag-audio'),
    diagFont: document.getElementById('diag-font'),
    diagState: document.getElementById('diag-state'),
    logConsole: document.getElementById('log-console'),
    alertContainer: document.getElementById('alert-container')
};

const DB_PATH = 'remote_stream_assets';

// 3. Event Listeners & Real-time Sync
document.addEventListener('DOMContentLoaded', () => {
    initDatabaseListener();
    
    // Media Form Submit
    UI.formMedia.addEventListener('submit', (e) => {
        e.preventDefault();
        saveData({
            video_url: UI.videoUrl.value.trim(),
            audio_url: UI.audioUrl.value.trim(),
            logo_url: UI.logoUrl.value.trim()
        }, "Media Assets");
    });
    
    // Typography Form Submit
    UI.formTypography.addEventListener('submit', (e) => {
        e.preventDefault();
        // The textarea natively supports UTF-8 emojis
        const textValue = UI.tickerText.value.trim();
        saveData({
            font_url: UI.fontUrl.value.trim(),
            ticker_text: textValue,
            weather_city: UI.weatherCity.value.trim()
        }, "Typography & Ticker");
    });
    
    // Master Switch Toggle
    UI.masterToggle.addEventListener('change', (e) => {
        saveData({ is_live: e.target.checked }, "Broadcast State");
    });
    
    // Sync Button
    UI.btnSync.addEventListener('click', () => {
        addLog("Forcing manual synchronization...", "info");
        initDatabaseListener();
    });
});

// 4. Core Functions
function initDatabaseListener() {
    const ref = database.ref(DB_PATH);
    
    ref.on('value', (snapshot) => {
        const data = snapshot.val();
        UI.dbStatusDot.className = 'status-indicator online';
        UI.dbStatusText.textContent = 'Sync Active';
        
        if (data) {
            updateDashboardUI(data);
            updateDiagnostics(data);
            addLog("Database schema received and applied.", "info");
        } else {
            createInitialSchema();
        }
    }, (error) => {
        UI.dbStatusDot.className = 'status-indicator offline';
        UI.dbStatusText.textContent = 'Sync Failed';
        addLog(`Database read error: ${error.message}`, "error");
        showAlert("Connection Lost", "Failed to sync with Firebase.", "error");
    });
}

function updateDashboardUI(data) {
    // Media
    if(data.video_url) UI.videoUrl.value = data.video_url;
    if(data.audio_url) UI.audioUrl.value = data.audio_url;
    if(data.logo_url) UI.logoUrl.value = data.logo_url;
    
    // Text & Typography
    if(data.font_url) UI.fontUrl.value = data.font_url;
    if(data.ticker_text) UI.tickerText.value = data.ticker_text;
    if(data.weather_city) UI.weatherCity.value = data.weather_city;
    
    // State
    if(data.is_live !== undefined) UI.masterToggle.checked = data.is_live;
}

function updateDiagnostics(data) {
    const setStatus = (elem, val) => {
        if(val && val.length > 10) {
            elem.textContent = "Configured";
            elem.className = "status-badge ok";
        } else {
            elem.textContent = "Missing";
            elem.className = "status-badge error";
        }
    };
    
    setStatus(UI.diagVideo, data.video_url);
    setStatus(UI.diagAudio, data.audio_url);
    setStatus(UI.diagFont, data.font_url);
    
    if(data.is_live) {
        UI.diagState.textContent = "BROADCASTING";
        UI.diagState.className = "status-badge ok";
    } else {
        UI.diagState.textContent = "OFFLINE";
        UI.diagState.className = "status-badge error";
    }
}

function saveData(updates, sectionName) {
    updates.last_updated = firebase.database.ServerValue.TIMESTAMP;
    
    database.ref(DB_PATH).update(updates)
        .then(() => {
            showAlert("Success", `${sectionName} updated successfully. Action will pick this up in the next loop.`, "success");
            addLog(`${sectionName} updated by admin.`, "success");
        })
        .catch((error) => {
            showAlert("Error", error.message, "error");
            addLog(`Failed to update ${sectionName}: ${error.message}`, "error");
        });
}

function createInitialSchema() {
    const defaultSchema = {
        video_url: "",
        audio_url: "",
        logo_url: "",
        font_url: "https://github.com/googlefonts/noto-emoji/raw/main/fonts/NotoColorEmoji.ttf", // Default Emoji Font
        ticker_text: "Welcome to MiTV Network 📺 Pakistan's Premier Cloud Broadcast ✨",
        weather_city: "Kasur, PK",
        is_live: true,
        last_updated: firebase.database.ServerValue.TIMESTAMP
    };
    
    database.ref(DB_PATH).set(defaultSchema);
    addLog("Initialized empty database schema with default emoji font.", "system");
}

// 5. Utility Functions (Logger & Toasts)
function addLog(message, type) {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    const time = new Date().toLocaleTimeString();
    entry.textContent = `[${time}] ${message}`;
    UI.logConsole.appendChild(entry);
    UI.logConsole.scrollTop = UI.logConsole.scrollHeight;
}

function showAlert(title, message, type = "success") {
    const toast = document.createElement('div');
    toast.className = `alert-toast ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle';
    
    toast.innerHTML = `
        <i class="fas ${icon} alert-icon"></i>
        <div class="alert-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
    `;
    
    UI.alertContainer.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
                                  }
  
