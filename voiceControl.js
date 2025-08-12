/**
 * 🖖 STAR TREK VOICE CONTROL MODULE
 * Více admirál Jiřík & Admirál Claude.AI
 * "Computer, engage!" - Voice commands pro audio přehrávač
 */

const DEBUG_VOICE = false; // Debug mode pro voice modul

class VoiceController {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.isEnabled = false;
        this.lastCommand = '';
        this.confidenceThreshold = 0.7;
        this.commandHistory = [];
        this.maxHistoryLength = 50;
        
        // UI elements
        this.toggleBtn = null;
        this.statusIndicator = null;
        this.commandDisplay = null;
        this.settingsPanel = null;
        
        // Voice command patterns
        this.commandPatterns = this.initializeCommandPatterns();
        
        // Responses
        this.responses = this.initializeResponses();
        
        this.init();
    }

    async init() {
        if (DEBUG_VOICE) console.log("🎤 VoiceController: Inicializace modulu");
        
        // Kontrola podpory prohlížeče
        if (!this.checkBrowserSupport()) {
            console.warn("VoiceController: Speech Recognition není podporováno");
            this.showNotification("Voice Control není podporován v tomto prohlížeči", 'error');
            return;
        }
        
        await this.loadSettings();
        this.setupSpeechRecognition();
        this.createUI();
        this.attachEventListeners();
        this.injectStyles();
    }

    checkBrowserSupport() {
        return ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
    }

    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = 'cs-CZ'; // Čeština primárně
        this.recognition.maxAlternatives = 3;
        
        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateUI();
            if (DEBUG_VOICE) console.log("🎤 Voice Recognition started");
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            this.updateUI();
            if (DEBUG_VOICE) console.log("🎤 Voice Recognition ended");
            
            // Auto-restart pokud je enabled
            if (this.isEnabled) {
                setTimeout(() => this.startListening(), 1000);
            }
        };
        
        this.recognition.onresult = (event) => {
            this.handleSpeechResult(event);
        };
        
        this.recognition.onerror = (event) => {
            console.error("Voice Recognition Error:", event.error);
            this.handleError(event.error);
        };
        
        this.recognition.onnomatch = () => {
            if (DEBUG_VOICE) console.log("🎤 No match found");
        };
    }

    initializeCommandPatterns() {
        return {
            // Základní ovládání
            play: [
                /^(computer\s+)?(start|play|begin|engage|spustit|přehrát)$/i,
                /^(computer\s+)?(resume|pokračovat|continue)$/i
            ],
            pause: [
                /^(computer\s+)?(pause|stop|zastavit|pozastavit)$/i,
                /^(computer\s+)?(halt|freeze|zmrazit)$/i
            ],
            next: [
                /^(computer\s+)?(next|další|forward|skip)(\s+track|\s+song|\s+skladbu)?$/i,
                /^(computer\s+)?(advance|pokračuj)(\s+to\s+next)?$/i
            ],
            previous: [
                /^(computer\s+)?(previous|předchozí|back|zpět)(\s+track|\s+song|\s+skladbu)?$/i,
                /^(computer\s+)?(go\s+back|vrať\s+se)$/i
            ],
            
            // Hlasitost
            volumeUp: [
                /^(computer\s+)?(volume\s+up|increase\s+volume|zvýšit?\s+hlasitost|hlasitěji)$/i,
                /^(computer\s+)?(louder|hlasitěji|more\s+volume)$/i
            ],
            volumeDown: [
                /^(computer\s+)?(volume\s+down|decrease\s+volume|snížit?\s+hlasitost|tišeji)$/i,
                /^(computer\s+)?(quieter|tišeji|less\s+volume)$/i
            ],
            mute: [
                /^(computer\s+)?(mute|ztlumit|silence|ticho)$/i,
                /^(computer\s+)?(turn\s+off\s+sound|vypnout\s+zvuk)$/i
            ],
            unmute: [
                /^(computer\s+)?(unmute|zapnout\s+zvuk|sound\s+on)$/i
            ],
            
            // Speciální funkce
            shuffle: [
                /^(computer\s+)?(shuffle|náhodně|random|mix)(\s+playlist|\s+tracky)?$/i,
                /^(computer\s+)?(randomize|zamíchej)$/i
            ],
            repeat: [
                /^(computer\s+)?(repeat|loop|opakovat|smyčka)(\s+this|\s+track|\s+song)?$/i,
                /^(computer\s+)?(replay|znovu)$/i
            ],
            
            // Navigace
            restart: [
                /^(computer\s+)?(restart|začátek|beginning|reset|znovu\s+od\s+začátku)$/i,
                /^(computer\s+)?(start\s+over|od\s+začátku)$/i
            ],
            
            // Informace
            status: [
                /^(computer\s+)?(what's\s+playing|co\s+hraje|current\s+track|aktuální\s+skladba)$/i,
                /^(computer\s+)?(status|report|stav)$/i
            ],
            time: [
                /^(computer\s+)?(what\s+time|kolik\s+je\s+hodin|current\s+time)$/i,
                /^(computer\s+)?(time\s+remaining|zbývající\s+čas)$/i
            ],
            
            // Záložky (integrace s bookmarkManager)
            bookmark: [
                /^(computer\s+)?(bookmark|záložka|mark\s+this|označ\s+toto)(\s+position|\s+pozici)?$/i,
                /^(computer\s+)?(save\s+position|ulož\s+pozici)$/i
            ],
            
            // Systémové
            fullscreen: [
                /^(computer\s+)?(fullscreen|full\s+screen|celá\s+obrazovka)$/i,
                /^(computer\s+)?(maximize|maximalizovat)$/i
            ],
            minimize: [
                /^(computer\s+)?(minimize|exit\s+fullscreen|ukončit\s+celou\s+obrazovku)$/i
            ],
            
            // Speciální Star Trek příkazy
            engage: [
                /^(computer\s+)?engage$/i,
                /^(computer\s+)?make\s+it\s+so$/i
            ],
            red_alert: [
                /^(computer\s+)?red\s+alert$/i,
                /^(computer\s+)?poplach$/i
            ]
        };
    }

    initializeResponses() {
        return {
            play: ["Zahajuji přehrávání", "Engaged", "Přehrávání spuštěno", "Aye, captain"],
            pause: ["Přehrávání pozastaveno", "Paused", "Zastaveno", "Acknowledged"],
            next: ["Další skladba", "Advancing to next track", "Pokračuji", "Next track loaded"],
            previous: ["Předchozí skladba", "Previous track", "Vracím se", "Going back"],
            volumeUp: ["Zvyšuji hlasitost", "Volume increased", "Hlasitěji", "Audio enhanced"],
            volumeDown: ["Snižuji hlasitost", "Volume decreased", "Tišeji", "Audio reduced"],
            mute: ["Zvuk ztlumen", "Audio muted", "Ticho", "Sound off"],
            unmute: ["Zvuk obnoven", "Audio restored", "Zvuk zapnut", "Sound on"],
            shuffle: ["Náhodné přehrávání", "Shuffle enabled", "Míchám playlist", "Random mode"],
            repeat: ["Opakování zapnuto", "Repeat enabled", "Smyčka aktivní", "Loop engaged"],
            restart: ["Začínám znovu", "Restarting track", "Od začátku", "Track reset"],
            bookmark: ["Pozice uložena", "Bookmark saved", "Záložka vytvořena", "Position marked"],
            fullscreen: ["Celá obrazovka", "Fullscreen mode", "Maximalizováno", "Full display"],
            engage: ["Engaged, captain!", "Make it so!", "Warp speed ahead!", "Systems online!"],
            red_alert: ["Red alert! All hands to battle stations!", "Poplach! Všichni na pozice!"],
            error: ["Příkaz nerozpoznán", "Command not understood", "Neznámý příkaz", "Unable to comply"],
            listening: ["Poslouchám", "Ready for commands", "Computer online", "Standing by"],
            offline: ["Voice control deaktivován", "Computer offline", "Hlasové ovládání vypnuto"]
        };
    }

    createUI() {
        // Toggle button do control panelu
        this.toggleBtn = document.createElement('button');
        this.toggleBtn.id = 'voice-toggle';
        this.toggleBtn.className = 'control-button voice-toggle';
        this.toggleBtn.title = 'Hlasové ovládání (Ctrl+V)';
        this.toggleBtn.innerHTML = '🎤';
        
        // Status indicator
        this.statusIndicator = document.createElement('div');
        this.statusIndicator.className = 'voice-status-indicator';
        this.toggleBtn.appendChild(this.statusIndicator);
        
        // Přidání do control panelu
        const controlsDiv = document.querySelector('#control-panel .controls');
        if (controlsDiv) {
            controlsDiv.appendChild(this.toggleBtn);
        }

        // Command display panel
        this.commandDisplay = document.createElement('div');
        this.commandDisplay.id = 'voice-command-display';
        this.commandDisplay.className = 'voice-command-display hidden';
        this.commandDisplay.innerHTML = `
            <div class="voice-display-header">
                <span class="voice-status-text">🎤 Voice Control</span>
                <button class="voice-settings-btn" title="Nastavení hlasového ovládání">⚙️</button>
            </div>
            <div class="voice-command-text">
                <span class="listening-indicator">● LISTENING</span>
                <span class="last-command"></span>
            </div>
            <div class="voice-commands-help">
                <div class="commands-section">
                    <strong>Základní příkazy:</strong><br>
                    "Computer, play" • "Computer, pause" • "Computer, next" • "Computer, previous"
                </div>
                <div class="commands-section">
                    <strong>Hlasitost:</strong><br>
                    "Computer, volume up" • "Computer, volume down" • "Computer, mute"
                </div>
                <div class="commands-section">
                    <strong>Speciální:</strong><br>
                    "Computer, engage" • "Computer, shuffle" • "Computer, bookmark"
                </div>
            </div>
        `;
        
        document.body.appendChild(this.commandDisplay);

        // Settings panel
        this.createSettingsPanel();

        // Cache DOM elements
        this.lastCommandSpan = this.commandDisplay.querySelector('.last-command');
        this.listeningIndicator = this.commandDisplay.querySelector('.listening-indicator');
        this.settingsBtn = this.commandDisplay.querySelector('.voice-settings-btn');
    }

    createSettingsPanel() {
        this.settingsPanel = document.createElement('div');
        this.settingsPanel.className = 'voice-settings-panel hidden';
        this.settingsPanel.innerHTML = `
            <div class="settings-header">
                <h3>🎤 Voice Control Settings</h3>
                <button class="settings-close">×</button>
            </div>
            <div class="settings-content">
                <div class="setting-group">
                    <label>Jazyk rozpoznávání:</label>
                    <select id="voice-language">
                        <option value="cs-CZ">Čeština (Česká republika)</option>
                        <option value="en-US">English (United States)</option>
                        <option value="sk-SK">Slovenčina</option>
                    </select>
                </div>
                <div class="setting-group">
                    <label>Práh spolehlivosti: <span id="confidence-value">70%</span></label>
                    <input type="range" id="confidence-slider" min="50" max="95" value="70" step="5">
                </div>
                <div class="setting-group">
                    <label>
                        <input type="checkbox" id="auto-restart"> 
                        Automatické restartování poslechu
                    </label>
                </div>
                <div class="setting-group">
                    <label>
                        <input type="checkbox" id="voice-feedback"> 
                        Hlasová odpověď na příkazy
                    </label>
                </div>
                <div class="setting-group">
                    <button id="test-voice" class="voice-btn">🔊 Test hlasové odpovědi</button>
                    <button id="clear-history" class="voice-btn">🗑️ Vymazat historii</button>
                </div>
            </div>
        `;
        document.body.appendChild(this.settingsPanel);
    }

    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .control-button.voice-toggle {
                position: relative;
                overflow: visible;
            }

            .control-button.voice-toggle.active {
                background: rgba(0, 212, 255, 0.2);
                color: #00d4ff;
                box-shadow: 0 0 15px rgba(0, 212, 255, 0.5);
            }

            .control-button.voice-toggle.listening {
                animation: voicePulse 1.5s ease-in-out infinite;
            }

            @keyframes voicePulse {
                0%, 100% { 
                    box-shadow: 0 0 15px rgba(255, 0, 0, 0.5); 
                    color: #ff4444; 
                }
                50% { 
                    box-shadow: 0 0 25px rgba(255, 0, 0, 0.8); 
                    color: #ff6666; 
                }
            }

            .voice-status-indicator {
                position: absolute;
                top: -2px;
                right: -2px;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #666;
                transition: all 0.3s ease;
            }

            .voice-status-indicator.online {
                background: #00ff00;
                box-shadow: 0 0 6px rgba(0, 255, 0, 0.6);
            }

            .voice-status-indicator.listening {
                background: #ff4444;
                box-shadow: 0 0 6px rgba(255, 68, 68, 0.6);
                animation: indicatorPulse 1s ease-in-out infinite;
            }

            @keyframes indicatorPulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.3); opacity: 0.7; }
            }

            .voice-command-display {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 350px;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 2px solid #00d4ff;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 212, 255, 0.3);
                backdrop-filter: blur(10px);
                z-index: 1001;
                font-family: 'Orbitron', monospace;
                color: #00d4ff;
            }

            .voice-command-display.hidden {
                display: none;
            }

            .voice-display-header {
                background: linear-gradient(90deg, #00d4ff 0%, #0066cc 100%);
                padding: 12px 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                color: #000;
                font-weight: bold;
            }

            .voice-settings-btn {
                background: rgba(0, 0, 0, 0.2);
                border: none;
                color: #fff;
                padding: 4px 8px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .voice-settings-btn:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .voice-command-text {
                padding: 16px;
                text-align: center;
            }

            .listening-indicator {
                display: block;
                font-size: 14px;
                font-weight: bold;
                margin-bottom: 8px;
                opacity: 0.7;
            }

            .listening-indicator.active {
                color: #ff4444;
                animation: textPulse 1s ease-in-out infinite;
            }

            @keyframes textPulse {
                0%, 100% { opacity: 0.7; }
                50% { opacity: 1; }
            }

            .last-command {
                display: block;
                font-size: 16px;
                font-weight: bold;
                min-height: 20px;
                color: #fff;
                background: rgba(0, 212, 255, 0.1);
                padding: 8px;
                border-radius: 6px;
                border: 1px solid rgba(0, 212, 255, 0.3);
            }

            .voice-commands-help {
                background: rgba(0, 0, 0, 0.2);
                padding: 12px;
                font-size: 11px;
                line-height: 1.4;
            }

            .commands-section {
                margin-bottom: 8px;
            }

            .commands-section:last-child {
                margin-bottom: 0;
            }

            .voice-settings-panel {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 400px;
                max-width: 90vw;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 2px solid #00d4ff;
                border-radius: 12px;
                box-shadow: 0 15px 40px rgba(0, 212, 255, 0.4);
                z-index: 1002;
                font-family: 'Orbitron', monospace;
            }

            .voice-settings-panel.hidden {
                display: none;
            }

            .settings-header {
                background: linear-gradient(90deg, #00d4ff 0%, #0066cc 100%);
                padding: 16px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                color: #000;
            }

            .settings-header h3 {
                margin: 0;
                font-size: 18px;
            }

            .settings-close {
                background: rgba(0, 0, 0, 0.3);
                border: none;
                color: #fff;
                font-size: 20px;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .settings-close:hover {
                background: rgba(255, 0, 0, 0.3);
            }

            .settings-content {
                padding: 20px;
                color: #00d4ff;
            }

            .setting-group {
                margin-bottom: 20px;
            }

            .setting-group:last-child {
                margin-bottom: 0;
            }

            .setting-group label {
                display: block;
                margin-bottom: 8px;
                font-weight: bold;
                font-size: 14px;
            }

            .setting-group select,
            .setting-group input[type="range"] {
                width: 100%;
                background: rgba(0, 212, 255, 0.1);
                border: 1px solid rgba(0, 212, 255, 0.3);
                border-radius: 6px;
                padding: 8px;
                color: #00d4ff;
                font-family: inherit;
            }

            .setting-group select:focus,
            .setting-group input[type="range"]:focus {
                outline: none;
                border-color: #00d4ff;
                box-shadow: 0 0 8px rgba(0, 212, 255, 0.3);
            }

            .setting-group input[type="checkbox"] {
                margin-right: 8px;
                transform: scale(1.2);
            }

            .voice-btn {
                background: rgba(0, 212, 255, 0.1);
                border: 1px solid rgba(0, 212, 255, 0.3);
                color: #00d4ff;
                padding: 10px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-family: inherit;
                font-size: 12px;
                margin-right: 10px;
                transition: all 0.2s ease;
            }

            .voice-btn:hover {
                background: rgba(0, 212, 255, 0.2);
                border-color: #00d4ff;
            }

            /* Mobile responsivita */
            @media (max-width: 768px) {
                .voice-command-display {
                    top: 10px;
                    right: 10px;
                    left: 10px;
                    width: auto;
                }
                
                .voice-settings-panel {
                    width: 95vw;
                }
                
                .settings-content {
                    padding: 16px;
                }
                
                .voice-commands-help {
                    font-size: 10px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    attachEventListeners() {
        // Toggle button
        this.toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Settings button
        this.settingsBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showSettings();
        });

        // Settings panel events
        const settingsClose = this.settingsPanel?.querySelector('.settings-close');
        settingsClose?.addEventListener('click', () => this.hideSettings());

        // Language change
        const langSelect = this.settingsPanel?.querySelector('#voice-language');
        langSelect?.addEventListener('change', (e) => {
            this.changeLanguage(e.target.value);
        });

        // Confidence threshold
        const confidenceSlider = this.settingsPanel?.querySelector('#confidence-slider');
        const confidenceValue = this.settingsPanel?.querySelector('#confidence-value');
        confidenceSlider?.addEventListener('input', (e) => {
            this.confidenceThreshold = e.target.value / 100;
            confidenceValue.textContent = e.target.value + '%';
            this.saveSettings();
        });

        // Test voice button
        const testBtn = this.settingsPanel?.querySelector('#test-voice');
        testBtn?.addEventListener('click', () => {
            this.speak("Voice control test successful, captain!");
        });

        // Clear history
        const clearBtn = this.settingsPanel?.querySelector('#clear-history');
        clearBtn?.addEventListener('click', () => {
            this.clearCommandHistory();
        });

        // Klávesové zkratky
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.ctrlKey && e.key === 'v') {
                e.preventDefault();
                this.toggle();
            }
        });

        // Klik mimo pro zavření
        document.addEventListener('click', (e) => {
            if (this.commandDisplay && 
                !this.commandDisplay.classList.contains('hidden') &&
                !this.commandDisplay.contains(e.target) && 
                e.target !== this.toggleBtn) {
                this.hideDisplay();
            }
            
            if (this.settingsPanel && 
                !this.settingsPanel.classList.contains('hidden') &&
                !this.settingsPanel.contains(e.target)) {
                this.hideSettings();
            }
        });
    }

    handleSpeechResult(event) {
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                const transcript = event.results[i][0].transcript.trim().toLowerCase();
                const confidence = event.results[i][0].confidence;
                
                if (DEBUG_VOICE) {
                    console.log(`🎤 Speech: "${transcript}" (confidence: ${confidence})`);
                }
                
                this.processCommand(transcript, confidence);
            }
        }
    }

    processCommand(transcript, confidence) {
        // Kontrola confidence threshold
        if (confidence < this.confidenceThreshold) {
            if (DEBUG_VOICE) {
                console.log(`🎤 Command ignored due to low confidence: ${confidence}`);
            }
            return;
        }

        this.lastCommand = transcript;
        this.updateCommandDisplay();
        
        // Přidání do historie
        this.addToHistory(transcript, confidence);
        
        // Hledání matching patternu
        let commandFound = false;
        
        for (const [commandType, patterns] of Object.entries(this.commandPatterns)) {
            for (const pattern of patterns) {
                if (pattern.test(transcript)) {
                    this.executeCommand(commandType, transcript);
                    commandFound = true;
                    break;
                }
            }
            if (commandFound) break;
        }
        
        if (!commandFound) {
            this.handleUnknownCommand(transcript);
        }
    }

    executeCommand(commandType, transcript) {
        if (DEBUG_VOICE) {
            console.log(`🎤 Executing command: ${commandType}`);
        }

        const audioPlayer = document.getElementById('audioPlayer');
        let success = true;
        let response = this.getRandomResponse(commandType);

        try {
            switch (commandType) {
                case 'play':
                    if (audioPlayer?.paused) {
                        document.getElementById('play-button')?.click();
                    }
                    break;
                    
                case 'pause':
                    if (audioPlayer && !audioPlayer.paused) {
                        document.getElementById('pause-button')?.click();
                    }
                    break;
                    
                case 'next':
                    document.getElementById('next-button')?.click();
                    break;
                    
                case 'previous':
                    document.getElementById('prev-button')?.click();
                    break;
                    
                case 'volumeUp':
                    this.adjustVolume(0.1);
                    break;
                    
                case 'volumeDown':
                    this.adjustVolume(-0.1);
                    break;
                    
                case 'mute':
                    document.getElementById('mute-button')?.click();
                    break;
                    
                case 'unmute':
                    if (audioPlayer?.muted) {
                        document.getElementById('mute-button')?.click();
                    }
                    break;
                    
                case 'shuffle':
                    document.getElementById('shuffle-button')?.click();
                    break;
                    
                case 'repeat':
                    document.getElementById('loop-button')?.click();
                    break;
                    
                case 'restart':
                    document.getElementById('reset-button')?.click();
                    break;
                    
                case 'fullscreen':
                    document.getElementById('fullscreen-toggle')?.click();
                    break;
                    
                case 'minimize':
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    }
                    break;
                    
                case 'status':
                    this.reportStatus();
                    return; // Status má vlastní response
                    
                case 'time':
                    this.reportTime();
                    return; // Time má vlastní response
                    
                case 'bookmark':
                    if (window.bookmarkManager) {
                        window.bookmarkManager.addCurrentBookmark();
                    } else {
                        response = "Bookmark manager není dostupný";
                    }
                    break;
                    
                case 'engage':
                    // Speciální Star Trek příkaz - spustí přehrávání
                    if (audioPlayer?.paused) {
                        document.getElementById('play-button')?.click();
                    }
                    response = this.getRandomResponse('engage');
                    break;
                    
                case 'red_alert':
                    // Easter egg - maximální hlasitost a play
                    if (audioPlayer) {
                        audioPlayer.volume = 1.0;
                        const volumeSlider = document.getElementById('volume-slider');
                        if (volumeSlider) volumeSlider.value = 1.0;
                        document.getElementById('play-button')?.click();
                    }
                    response = this.getRandomResponse('red_alert');
                    break;
                    
                default:
                    success = false;
                    response = this.getRandomResponse('error');
            }
        } catch (error) {
            console.error("Voice command execution error:", error);
            success = false;
            response = "Chyba při vykonávání příkazu";
        }

        // Hlasová odpověď
        this.speak(response);
        
        // Visual feedback
        this.showNotification(
            `🎤 "${transcript}" → ${response}`, 
            success ? 'success' : 'error'
        );
    }

    adjustVolume(delta) {
        const audioPlayer = document.getElementById('audioPlayer');
        const volumeSlider = document.getElementById('volume-slider');
        
        if (!audioPlayer || !volumeSlider) return;
        
        const currentVolume = parseFloat(volumeSlider.value);
        const newVolume = Math.max(0, Math.min(1, currentVolume + delta));
        
        volumeSlider.value = newVolume;
        volumeSlider.dispatchEvent(new Event('input'));
    }

    reportStatus() {
        const audioPlayer = document.getElementById('audioPlayer');
        const trackTitle = document.getElementById('trackTitle')?.textContent || 'Neznámý track';
        
        if (!audioPlayer) {
            this.speak("Audio přehrávač není dostupný");
            return;
        }
        
        const status = audioPlayer.paused ? 'pozastaven' : 'přehrává';
        const volume = Math.round(audioPlayer.volume * 100);
        const currentTime = this.formatTime(audioPlayer.currentTime);
        
        const statusMessage = `Aktuálně ${status}: ${trackTitle}. Hlasitost ${volume} procent. Pozice ${currentTime}.`;
        this.speak(statusMessage);
    }

    reportTime() {
        const audioPlayer = document.getElementById('audioPlayer');
        const now = new Date();
        const timeString = now.toLocaleTimeString('cs-CZ');
        
        let message = `Aktuální čas: ${timeString}`;
        
        if (audioPlayer && audioPlayer.duration) {
            const remaining = audioPlayer.duration - audioPlayer.currentTime;
            const remainingTime = this.formatTime(remaining);
            message += `. Zbývá ${remainingTime} skladby.`;
        }
        
        this.speak(message);
    }

    handleUnknownCommand(transcript) {
        if (DEBUG_VOICE) {
            console.log(`🎤 Unknown command: "${transcript}"`);
        }
        
        const response = this.getRandomResponse('error');
        this.speak(response);
        
        this.showNotification(
            `🎤 Nerozpoznaný příkaz: "${transcript}"`, 
            'warn'
        );
    }

    handleError(error) {
        let message = "Chyba hlasového rozpoznávání";
        
        switch (error) {
            case 'no-speech':
                message = "Žádný hlas nebyl detekován";
                break;
            case 'audio-capture':
                message = "Chyba při záznamu zvuku";
                break;
            case 'not-allowed':
                message = "Přístup k mikrofonu byl odepřen";
                break;
            case 'network':
                message = "Chyba sítě při rozpoznávání";
                break;
            case 'service-not-allowed':
                message = "Služba rozpoznávání není povolena";
                break;
        }
        
        this.showNotification(message, 'error');
        
        if (error === 'not-allowed') {
            this.isEnabled = false;
            this.updateUI();
        }
    }

    getRandomResponse(commandType) {
        const responses = this.responses[commandType] || this.responses.error;
        return responses[Math.floor(Math.random() * responses.length)];
    }

    speak(text, options = {}) {
        // Kontrola, zda je hlasová odpověď povolena
        const voiceFeedback = this.settingsPanel?.querySelector('#voice-feedback')?.checked ?? true;
        if (!voiceFeedback) return;
        
        if ('speechSynthesis' in window) {
            // Zastavení současného mluvení
            window.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = this.recognition?.lang || 'cs-CZ';
            utterance.rate = options.rate || 1.0;
            utterance.pitch = options.pitch || 1.0;
            utterance.volume = options.volume || 0.8;
            
            // Najít vhodný hlas
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(voice => 
                voice.lang.startsWith(utterance.lang.substring(0, 2))
            );
            if (preferredVoice) utterance.voice = preferredVoice;
            
            window.speechSynthesis.speak(utterance);
        }
    }

    addToHistory(transcript, confidence) {
        const historyItem = {
            transcript,
            confidence,
            timestamp: Date.now()
        };
        
        this.commandHistory.unshift(historyItem);
        
        // Omezení historie
        if (this.commandHistory.length > this.maxHistoryLength) {
            this.commandHistory = this.commandHistory.slice(0, this.maxHistoryLength);
        }
        
        this.saveSettings();
    }

    clearCommandHistory() {
        this.commandHistory = [];
        this.saveSettings();
        this.showNotification("Historie příkazů vymazána", 'info');
    }

    formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        
        if (h > 0) {
            return `${h} hodin ${m} minut`;
        } else if (m > 0) {
            return `${m} minut ${s} sekund`;
        } else {
            return `${s} sekund`;
        }
    }

    updateCommandDisplay() {
        if (this.lastCommandSpan) {
            this.lastCommandSpan.textContent = this.lastCommand || 'Poslouchám...';
        }
    }

    updateUI() {
        // Toggle button states
        this.toggleBtn?.classList.toggle('active', this.isEnabled);
        this.toggleBtn?.classList.toggle('listening', this.isListening);
        
        // Status indicator
        if (this.statusIndicator) {
            this.statusIndicator.classList.remove('online', 'listening');
            if (this.isEnabled) {
                this.statusIndicator.classList.add('online');
                if (this.isListening) {
                    this.statusIndicator.classList.add('listening');
                }
            }
        }
        
        // Listening indicator
        if (this.listeningIndicator) {
            this.listeningIndicator.classList.toggle('active', this.isListening);
            this.listeningIndicator.textContent = this.isListening ? '● LISTENING' : '○ READY';
        }
        
        // Command display visibility
        if (this.commandDisplay) {
            this.commandDisplay.classList.toggle('hidden', !this.isEnabled);
        }
    }

    changeLanguage(langCode) {
        if (this.recognition) {
            this.recognition.lang = langCode;
            this.saveSettings();
            
            if (this.isListening) {
                this.stopListening();
                setTimeout(() => this.startListening(), 500);
            }
            
            this.showNotification(`Jazyk změněn na: ${langCode}`, 'info');
        }
    }

    startListening() {
        if (!this.recognition || this.isListening) return;
        
        try {
            this.recognition.start();
        } catch (error) {
            console.error("Failed to start voice recognition:", error);
            this.handleError(error.message);
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    toggle() {
        if (this.isEnabled) {
            this.disable();
        } else {
            this.enable();
        }
    }

    enable() {
        this.isEnabled = true;
        this.startListening();
        this.updateUI();
        this.speak(this.getRandomResponse('listening'));
        this.showNotification("🎤 Voice Control aktivován", 'success');
        this.saveSettings();
    }

    disable() {
        this.isEnabled = false;
        this.stopListening();
        this.updateUI();
        this.speak(this.getRandomResponse('offline'));
        this.showNotification("🎤 Voice Control deaktivován", 'info');
        this.saveSettings();
    }

    showDisplay() {
        if (this.commandDisplay) {
            this.commandDisplay.classList.remove('hidden');
        }
    }

    hideDisplay() {
        if (this.commandDisplay) {
            this.commandDisplay.classList.add('hidden');
        }
    }

    showSettings() {
        if (this.settingsPanel) {
            this.settingsPanel.classList.remove('hidden');
            this.loadSettingsUI();
        }
    }

    hideSettings() {
        if (this.settingsPanel) {
            this.settingsPanel.classList.add('hidden');
        }
    }

    loadSettingsUI() {
        // Načtení hodnot do UI
        const langSelect = this.settingsPanel?.querySelector('#voice-language');
        if (langSelect) langSelect.value = this.recognition?.lang || 'cs-CZ';
        
        const confidenceSlider = this.settingsPanel?.querySelector('#confidence-slider');
        const confidenceValue = this.settingsPanel?.querySelector('#confidence-value');
        if (confidenceSlider && confidenceValue) {
            const value = Math.round(this.confidenceThreshold * 100);
            confidenceSlider.value = value;
            confidenceValue.textContent = value + '%';
        }
        
        const voiceFeedback = this.settingsPanel?.querySelector('#voice-feedback');
        if (voiceFeedback) voiceFeedback.checked = true; // Default enabled
    }

    showNotification(message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // Data persistence
    async saveSettings() {
        const settings = {
            isEnabled: this.isEnabled,
            language: this.recognition?.lang || 'cs-CZ',
            confidenceThreshold: this.confidenceThreshold,
            commandHistory: this.commandHistory.slice(0, 20), // Limit saved history
            timestamp: Date.now()
        };

        // LocalStorage backup
        localStorage.setItem('voiceControlSettings', JSON.stringify(settings));

        // Firestore save (if available)
        try {
            if (typeof window.saveVoiceSettingsToFirestore === 'function') {
                await window.saveVoiceSettingsToFirestore(settings);
            }
        } catch (error) {
            console.warn("VoiceController: Firestore save failed:", error);
        }

        if (DEBUG_VOICE) {
            console.log("🎤 Voice settings saved:", settings);
        }
    }

    async loadSettings() {
        try {
            // Try Firestore first
            if (typeof window.loadVoiceSettingsFromFirestore === 'function') {
                const firestoreSettings = await window.loadVoiceSettingsFromFirestore();
                if (firestoreSettings) {
                    this.applySettings(firestoreSettings);
                    if (DEBUG_VOICE) {
                        console.log("🎤 Voice settings loaded from Firestore");
                    }
                    return;
                }
            }
        } catch (error) {
            console.warn("VoiceController: Firestore load failed:", error);
        }

        // Fallback to localStorage
        const savedSettings = localStorage.getItem('voiceControlSettings');
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                this.applySettings(settings);
                if (DEBUG_VOICE) {
                    console.log("🎤 Voice settings loaded from localStorage");
                }
            } catch (error) {
                console.error("VoiceController: Failed to parse saved settings:", error);
            }
        }
    }

    applySettings(settings) {
        if (settings.language && this.recognition) {
            this.recognition.lang = settings.language;
        }
        if (settings.confidenceThreshold) {
            this.confidenceThreshold = settings.confidenceThreshold;
        }
        if (settings.commandHistory) {
            this.commandHistory = settings.commandHistory;
        }
        // Note: isEnabled není automaticky aplikováno pro bezpečnost
    }

    // Export/Import functions
    exportSettings() {
        const data = {
            settings: {
                language: this.recognition?.lang || 'cs-CZ',
                confidenceThreshold: this.confidenceThreshold
            },
            commandHistory: this.commandHistory,
            commandPatterns: Object.keys(this.commandPatterns),
            timestamp: Date.now(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `star-trek-voice-settings-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('📁 Nastavení hlasu exportována', 'success');
    }

    // API pro externí použití
    isVoiceEnabled() {
        return this.isEnabled;
    }

    isCurrentlyListening() {
        return this.isListening;
    }

    getCommandHistory(limit = 10) {
        return this.commandHistory.slice(0, limit);
    }

    addCustomCommand(pattern, callback, commandType = 'custom') {
        if (!this.commandPatterns[commandType]) {
            this.commandPatterns[commandType] = [];
        }
        this.commandPatterns[commandType].push(pattern);
        
        // Pro custom příkazy, uložíme callback
        if (!this.customCommands) this.customCommands = new Map();
        this.customCommands.set(commandType, callback);
    }

    // Test function pro debugging
    testCommand(transcript) {
        if (DEBUG_VOICE) {
            console.log(`🎤 Testing command: "${transcript}"`);
            this.processCommand(transcript, 1.0);
        }
    }
}

// Globální inicializace
let voiceController;

// Auto-inicializace po DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Malé zpoždění kvůli ostatním modulům
        setTimeout(() => {
            voiceController = new VoiceController();
            window.voiceController = voiceController; // Global access
        }, 1000);
    });
} else {
    setTimeout(() => {
        voiceController = new VoiceController();
        window.voiceController = voiceController;
    }, 1000);
}

// Export pro ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceController;
}
