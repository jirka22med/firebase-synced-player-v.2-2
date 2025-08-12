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
        this.confidence = 0.7; // Minimální confidence pro rozpoznání
        this.language = 'cs-CZ'; // Čeština jako primární
        this.fallbackLanguage = 'en-US'; // Angličtina jako fallback
        this.currentLanguage = this.language;
        
        // DOM elements
        this.toggleBtn = null;
        this.helpBtn = null; // 🆕 Nové tlačítko pro help
        this.statusIndicator = null;
        this.settingsPanel = null;
        this.commandsList = null;
        
        // Voice responses
        this.voiceResponses = true;
        this.responseVoice = null;
        
        // 🆕 Audio management
        this.wasPlayingBeforeRecognition = false;
        this.audioPreventionActive = true; // Zabránit automatickému pauzování
        
        // Command patterns
        this.commands = new Map();
        this.lastCommand = null;
        this.commandHistory = [];
        
        this.init();
    }

    async init() {
        if (DEBUG_VOICE) console.log("🎤 VoiceController: Inicializace modulu");
        
        if (!this.checkBrowserSupport()) {
            this.showNotification("Váš prohlížeč nepodporuje rozpoznávání řeči", 'error');
            return;
        }
        
        await this.loadSettings();
        this.setupCommands();
        this.createUI();
        this.setupRecognition();
        this.attachEventListeners();
        this.injectStyles();
        
        // Auto-enable pokud bylo aktivní
        if (this.isEnabled) {
            this.startListening();
        }
    }

    checkBrowserSupport() {
        const hasWebkitSpeechRecognition = 'webkitSpeechRecognition' in window;
        const hasSpeechRecognition = 'SpeechRecognition' in window;
        
        if (!hasWebkitSpeechRecognition && !hasSpeechRecognition) {
            console.error("VoiceController: Speech Recognition není podporováno");
            return false;
        }
        
        return true;
    }

    setupCommands() {
        // Český příkazy
        const czechCommands = [
            // Základní ovládání
            { patterns: ['přehrát', 'play', 'spustit', 'start'], action: 'play', description: 'Spustí přehrávání' },
            { patterns: ['pauza', 'pause', 'pozastavit', 'stop'], action: 'pause', description: 'Pozastaví přehrávání' },
            { patterns: ['další', 'next', 'následující', 'skip'], action: 'next', description: 'Další skladba' },
            { patterns: ['předchozí', 'previous', 'předešlá', 'back'], action: 'previous', description: 'Předchozí skladba' },
            { patterns: ['restart', 'znovu', 'od začátku', 'reset'], action: 'restart', description: 'Restart skladby' },
            
            // Hlasitost
            { patterns: ['hlasitost nahoru', 'volume up', 'zesilte', 'louder'], action: 'volumeUp', description: 'Zvýší hlasitost' },
            { patterns: ['hlasitost dolů', 'volume down', 'ztiště', 'quieter'], action: 'volumeDown', description: 'Sníží hlasitost' },
            { patterns: ['ztlumit', 'mute', 'ticho', 'silence'], action: 'mute', description: 'Ztlumí zvuk' },
            { patterns: ['zrušit ztlumení', 'unmute', 'sound on'], action: 'unmute', description: 'Zruší ztlumení' },
            { patterns: ['hlasitost maximum', 'volume max', 'full volume'], action: 'volumeMax', description: 'Maximální hlasitost' },
            { patterns: ['hlasitost minimum', 'volume min', 'very quiet'], action: 'volumeMin', description: 'Minimální hlasitost' },
            
            // Režimy
            { patterns: ['náhodné přehrávání', 'shuffle', 'zamíchat', 'random'], action: 'toggleShuffle', description: 'Zapne/vypne shuffle' },
            { patterns: ['opakování', 'loop', 'repeat', 'opakovat'], action: 'toggleLoop', description: 'Zapne/vypne opakování' },
            { patterns: ['celá obrazovka', 'fullscreen', 'maximize'], action: 'toggleFullscreen', description: 'Celá obrazovka' },
            
            // Navigace
            { patterns: ['zobrazit playlist', 'show playlist', 'seznam skladeb'], action: 'showPlaylist', description: 'Zobrazí playlist' },
            { patterns: ['skrýt playlist', 'hide playlist', 'schovat playlist'], action: 'hidePlaylist', description: 'Skryje playlist' },
            { patterns: ['oblíbené', 'favorites', 'bookmarks', 'záložky'], action: 'showFavorites', description: 'Zobrazí oblíbené' },
            
            // Star Trek specifické
            { patterns: ['computer', 'počítač', 'engage', 'aktivovat'], action: 'acknowledge', description: 'Potvrzení příkazu' },
            { patterns: ['red alert', 'červený poplach', 'emergency'], action: 'emergencyStop', description: 'Nouzové zastavení' },
            { patterns: ['warp speed', 'warp rychlost', 'maximum warp'], action: 'warpSpeed', description: 'Rychlé přehrávání' },
            { patterns: ['impulse power', 'impulse', 'normální rychlost'], action: 'normalSpeed', description: 'Normální rychlost' },
            { patterns: ['beam me up', 'transportér', 'teleport'], action: 'randomTrack', description: 'Náhodná skladba' },
            
            // Informace
            { patterns: ['co hraje', 'what\'s playing', 'aktuální skladba', 'current track'], action: 'getCurrentTrack', description: 'Oznámí aktuální skladbu' },
            { patterns: ['kolik času zbývá', 'time remaining', 'zbývající čas'], action: 'getTimeRemaining', description: 'Oznámí zbývající čas' },
            { patterns: ['status report', 'stav', 'report', 'hlášení'], action: 'getStatusReport', description: 'Hlášení o stavu přehrávače' },
            
            // Ovládání modulu
            { patterns: ['help', 'nápověda', 'příkazy', 'commands'], action: 'showHelp', description: 'Zobrazí dostupné příkazy' },
            { patterns: ['voice off', 'hlas vypnout', 'stop listening', 'deaktivovat'], action: 'disableVoice', description: 'Vypne hlasové ovládání' }
        ];

        czechCommands.forEach(cmd => {
            cmd.patterns.forEach(pattern => {
                this.commands.set(pattern.toLowerCase(), {
                    action: cmd.action,
                    description: cmd.description,
                    pattern: pattern
                });
            });
        });

        if (DEBUG_VOICE) {
            console.log("🎤 Commands loaded:", this.commands.size);
        }
    }

    setupRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = this.currentLanguage;
        this.recognition.maxAlternatives = 3;
        
        // 🆕 Zabránit automatickému pauzování audia
        this.wasPlayingBeforeRecognition = false;
        this.audioPreventionActive = true; // Můžeme vypnout v nastavení
        
        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateStatusIndicator('listening');
            
            // 🆕 Uložit stav přehrávání a zabránit pauzování
            const audioPlayer = document.getElementById('audioPlayer');
            if (audioPlayer && !audioPlayer.paused && this.audioPreventionActive) {
                this.wasPlayingBeforeRecognition = true;
                
                // Pokusit se zabránit automatické pauze
                setTimeout(() => {
                    if (audioPlayer.paused && this.wasPlayingBeforeRecognition) {
                        audioPlayer.play().catch(err => {
                            if (DEBUG_VOICE) console.log("🎤 Auto-resume failed:", err);
                        });
                    }
                }, 100);
            }
            
            if (DEBUG_VOICE) console.log("🎤 Voice recognition started");
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            this.updateStatusIndicator('inactive');
            
            // 🆕 Obnovit přehrávání pokud bylo aktivní
            if (this.wasPlayingBeforeRecognition && this.audioPreventionActive) {
                const audioPlayer = document.getElementById('audioPlayer');
                if (audioPlayer && audioPlayer.paused) {
                    setTimeout(() => {
                        audioPlayer.play().catch(err => {
                            if (DEBUG_VOICE) console.log("🎤 Auto-resume after recognition failed:", err);
                        });
                    }, 50);
                }
                this.wasPlayingBeforeRecognition = false;
            }
            
            // Auto-restart pokud je aktivní
            if (this.isEnabled) {
                setTimeout(() => {
                    this.startListening();
                }, 1000);
            }
            
            if (DEBUG_VOICE) console.log("🎤 Voice recognition ended");
        };
        
        this.recognition.onerror = (event) => {
           // console.error("🎤 Voice recognition error:", event.error);
            this.updateStatusIndicator('error');
            
            if (event.error === 'no-speech') {
                // Normální situace, neděláme nic
                return;
            }
            
            if (event.error === 'not-allowed') {
                this.showNotification("Přístup k mikrofonu byl odepřen", 'error');
                this.disable();
                return;
            }
            
            // Fallback na angličtinu při chybě jazyka
            if (event.error === 'language-not-supported' && this.currentLanguage === this.language) {
                this.currentLanguage = this.fallbackLanguage;
                this.recognition.lang = this.currentLanguage;
                this.showNotification("Přepínám na anglické rozpoznávání", 'warn');
                setTimeout(() => this.startListening(), 500);
            }
        };
        
        this.recognition.onresult = (event) => {
            const results = event.results[event.resultIndex];
            const transcript = results[0].transcript.trim().toLowerCase();
            const confidence = results[0].confidence;
            
            if (DEBUG_VOICE) {
                console.log("🎤 Recognized:", transcript, "Confidence:", confidence);
            }
            
            if (confidence >= this.confidence) {
                this.processCommand(transcript, confidence);
            } else {
                if (DEBUG_VOICE) console.log("🎤 Low confidence, ignoring");
            }
        };

        // Nastavení hlasových odpovědí
        if ('speechSynthesis' in window) {
            this.loadVoices();
            window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
        }
    }

    loadVoices() {
        const voices = speechSynthesis.getVoices();
        
        // Preferované hlasy (čeština nebo angličtina)
        const preferredVoices = [
            'cs-CZ', 'sk-SK', // Čeština/Slovenština
            'en-US', 'en-GB', // Angličtina
        ];
        
        for (const lang of preferredVoices) {
            const voice = voices.find(v => v.lang.startsWith(lang));
            if (voice) {
                this.responseVoice = voice;
                break;
            }
        }
        
        if (!this.responseVoice && voices.length > 0) {
            this.responseVoice = voices[0];
        }
        
        if (DEBUG_VOICE) {
            console.log("🎤 Voice loaded:", this.responseVoice?.name, this.responseVoice?.lang);
        }
    }

    processCommand(transcript, confidence) {
        let matchedCommand = null;
        let bestMatch = '';
        
        // Hledání nejlepšího match
        for (const [pattern, command] of this.commands) {
            if (transcript.includes(pattern)) {
                if (pattern.length > bestMatch.length) {
                    bestMatch = pattern;
                    matchedCommand = command;
                }
            }
        }
        
        if (matchedCommand) {
            this.updateStatusIndicator('processing');
            this.executeCommand(matchedCommand, transcript, confidence);
            
            // Uložení do historie
            this.commandHistory.unshift({
                transcript,
                command: matchedCommand.action,
                confidence,
                timestamp: Date.now()
            });
            
            // Omezení historie na 20 položek
            if (this.commandHistory.length > 20) {
                this.commandHistory = this.commandHistory.slice(0, 20);
            }
            
        } else {
            if (DEBUG_VOICE) {
                console.log("🎤 No command matched for:", transcript);
            }
            this.speak("Nerozumím tomuto příkazu");
        }
    }

    executeCommand(command, transcript, confidence) {
        if (DEBUG_VOICE) {
            console.log("🎤 Executing command:", command.action, transcript);
        }
        
        const audioPlayer = document.getElementById('audioPlayer');
        
        switch (command.action) {
            case 'play':
                document.getElementById('play-button')?.click();
                this.speak("Spouštím přehrávání");
                break;
                
            case 'pause':
                document.getElementById('pause-button')?.click();
                this.speak("Pozastavuji");
                break;
                
            case 'next':
                document.getElementById('next-button')?.click();
                this.speak("Další skladba");
                break;
                
            case 'previous':
                document.getElementById('prev-button')?.click();
                this.speak("Předchozí skladba");
                break;
                
            case 'restart':
                document.getElementById('reset-button')?.click();
                this.speak("Spouštím od začátku");
                break;
                
            case 'volumeUp':
                this.adjustVolume(0.1);
                this.speak("Zvyšuji hlasitost");
                break;
                
            case 'volumeDown':
                this.adjustVolume(-0.1);
                this.speak("Snižuji hlasitost");
                break;
                
            case 'volumeMax':
                this.setVolume(1.0);
                this.speak("Maximální hlasitost");
                break;
                
            case 'volumeMin':
                this.setVolume(0.1);
                this.speak("Minimální hlasitost");
                break;
                
            case 'mute':
                document.getElementById('mute-button')?.click();
                this.speak("Ztlumeno");
                break;
                
            case 'unmute':
                if (audioPlayer?.muted) {
                    document.getElementById('mute-button')?.click();
                    this.speak("Zvuk obnoven");
                }
                break;
                
            case 'toggleShuffle':
                document.getElementById('shuffle-button')?.click();
                const shuffleActive = document.getElementById('shuffle-button')?.classList.contains('active');
                this.speak(shuffleActive ? "Náhodné přehrávání zapnuto" : "Náhodné přehrávání vypnuto");
                break;
                
            case 'toggleLoop':
                document.getElementById('loop-button')?.click();
                const loopActive = document.getElementById('loop-button')?.classList.contains('active');
                this.speak(loopActive ? "Opakování zapnuto" : "Opakování vypnuto");
                break;
                
            case 'toggleFullscreen':
                document.getElementById('fullscreen-toggle')?.click();
                this.speak("Přepínám celou obrazovku");
                break;
                
            case 'showPlaylist':
                const playlistBtn = document.getElementById('toggle-playlist-button');
                if (!playlistBtn?.classList.contains('active')) {
                    playlistBtn?.click();
                }
                this.speak("Zobrazuji playlist");
                break;
                
            case 'hidePlaylist':
                const playlistBtn2 = document.getElementById('toggle-playlist-button');
                if (playlistBtn2?.classList.contains('active')) {
                    playlistBtn2?.click();
                }
                this.speak("Schovávám playlist");
                break;
                
            case 'showFavorites':
                document.getElementById('favorites-button')?.click();
                this.speak("Zobrazuji oblíbené");
                break;
                
            case 'acknowledge':
                const responses = [
                    "Jsem připraven k plnění rozkazů",
                    "Systém online, čekám na příkazy",
                    "Audio systém aktivní",
                    "Přehrávač připraven"
                ];
                this.speak(responses[Math.floor(Math.random() * responses.length)]);
                break;
                
            case 'emergencyStop':
                audioPlayer?.pause();
                if (audioPlayer) audioPlayer.currentTime = 0;
                this.speak("Nouzové zastavení provedeno");
                break;
                
            case 'warpSpeed':
                if (audioPlayer) audioPlayer.playbackRate = 1.5;
                this.speak("Warp rychlost aktivována");
                break;
                
            case 'normalSpeed':
                if (audioPlayer) audioPlayer.playbackRate = 1.0;
                this.speak("Impulse rychlost obnovena");
                break;
                
            case 'randomTrack':
                if (!document.getElementById('shuffle-button')?.classList.contains('active')) {
                    document.getElementById('shuffle-button')?.click();
                }
                document.getElementById('next-button')?.click();
                this.speak("Transportér aktivován, přenáším na náhodnou skladbu");
                break;
                
            case 'getCurrentTrack':
                const currentTrack = document.getElementById('trackTitle')?.textContent;
                if (currentTrack) {
                    this.speak(`Aktuálně hraje: ${currentTrack}`);
                } else {
                    this.speak("Žádná skladba není spuštěna");
                }
                break;
                
            case 'getTimeRemaining':
                if (audioPlayer?.duration) {
                    const remaining = audioPlayer.duration - audioPlayer.currentTime;
                    const minutes = Math.floor(remaining / 60);
                    const seconds = Math.floor(remaining % 60);
                    this.speak(`Zbývá ${minutes} minut a ${seconds} sekund`);
                } else {
                    this.speak("Nelze určit zbývající čas");
                }
                break;
                
            case 'getStatusReport':
                this.generateStatusReport();
                break;
                
            case 'showHelp':
                this.showCommandsHelp();
                break;
                
            case 'disableVoice':
                this.speak("Deaktibuji hlasové ovládání");
                setTimeout(() => this.disable(), 2000);
                break;
                
            default:
                this.speak("Příkaz rozpoznán, ale není implementován");
        }
        
        // Visual feedback
        this.showCommandFeedback(command.action, transcript);
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

    setVolume(volume) {
        const volumeSlider = document.getElementById('volume-slider');
        if (!volumeSlider) return;
        
        volumeSlider.value = Math.max(0, Math.min(1, volume));
        volumeSlider.dispatchEvent(new Event('input'));
    }

    generateStatusReport() {
        const audioPlayer = document.getElementById('audioPlayer');
        const trackTitle = document.getElementById('trackTitle')?.textContent || "Neznámá";
        const isPlaying = audioPlayer && !audioPlayer.paused;
        const volume = audioPlayer ? Math.round(audioPlayer.volume * 100) : 0;
        const shuffleOn = document.getElementById('shuffle-button')?.classList.contains('active');
        const loopOn = document.getElementById('loop-button')?.classList.contains('active');
        
        const report = [
            `Status report:`,
            `Přehrávač je ${isPlaying ? 'aktivní' : 'v pohotovosti'}`,
            `Aktuální skladba: ${trackTitle}`,
            `Hlasitost: ${volume} procent`,
            shuffleOn ? "Náhodné přehrávání aktivní" : "Sekvenční přehrávání",
            loopOn ? "Opakování aktivní" : "Jednorázové přehrávání"
        ].join(". ");
        
        this.speak(report);
    }

    showCommandsHelp() {
        this.speak("Dostupné příkazy: přehrát, pauza, další, předchozí, hlasitost nahoru, hlasitost dolů, náhodné přehrávání, opakování, co hraje, status report");
        
        // Zobrazit také vizuální help
        if (this.settingsPanel) {
            this.showSettings();
        }
    }

    speak(text) {
        if (!this.voiceResponses || !('speechSynthesis' in window)) return;
        
        // Zastavit předchozí řeč
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = this.responseVoice;
        utterance.volume = 0.8;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        
        if (DEBUG_VOICE) {
            console.log("🎤 Speaking:", text);
        }
        
        speechSynthesis.speak(utterance);
    }

    showCommandFeedback(action, transcript) {
        // Krátký visual feedback
        if (this.statusIndicator) {
            this.statusIndicator.classList.add('command-executed');
            setTimeout(() => {
                this.statusIndicator?.classList.remove('command-executed');
            }, 1000);
        }
        
        // Zobrazit v notifikaci
        this.showNotification(`🎤 "${transcript}"`, 'info', 2000);
    }

    createUI() {
        // Toggle button
        this.toggleBtn = document.createElement('button');
        this.toggleBtn.id = 'voice-control-toggle';
        this.toggleBtn.className = 'control-button voice-control-toggle';
        this.toggleBtn.title = 'Hlasové ovládání (Ctrl+V)';
        this.toggleBtn.innerHTML = '🎤';
        
        // Status indicator
        this.statusIndicator = document.createElement('div');
        this.statusIndicator.className = 'voice-status-indicator';
        this.toggleBtn.appendChild(this.statusIndicator);
        
        // 🆕 Help button pro hlasové příkazy
        this.helpBtn = document.createElement('button');
        this.helpBtn.id = 'voice-commands-help';
        this.helpBtn.className = 'control-button voice-help-button';
        this.helpBtn.title = 'Hlasové příkazy (?)';
        this.helpBtn.innerHTML = '📋';
        
        // Přidání do control panelu
        const controlsDiv = document.querySelector('#control-panel .controls');
        if (controlsDiv) {
            controlsDiv.appendChild(this.toggleBtn);
            controlsDiv.appendChild(this.helpBtn); // 🆕 Přidáno help tlačítko
        }

        // Settings panel
        this.createSettingsPanel();
        
        if (DEBUG_VOICE) console.log("🎤 UI created");
    }

    createSettingsPanel() {
        this.settingsPanel = document.createElement('div');
        this.settingsPanel.id = 'voice-settings-panel';
        this.settingsPanel.className = 'voice-settings-panel hidden';
        
        this.settingsPanel.innerHTML = `
            <div class="voice-settings-header">
                <h3>🎤 Hlasové ovládání</h3>
                <button class="close-settings">✕</button>
            </div>
            
            <div class="voice-settings-content">
                <div class="setting-group">
                    <label>
                        <input type="checkbox" id="voice-responses-toggle" ${this.voiceResponses ? 'checked' : ''}>
                        Hlasové odpovědi
                    </label>
                    <small>Počítač bude slovně odpovídat na příkazy</small>
                </div>
                
                <div class="setting-group">
                    <label>
                        <input type="checkbox" id="audio-prevention-toggle" ${this.audioPreventionActive ? 'checked' : ''}>
                        Zabránit pauzování hudby
                    </label>
                    <small>Automaticky obnoví přehrávání po hlasových příkazech</small>
                </div>
                
                <div class="setting-group">
                    <label for="voice-confidence">Citlivost rozpoznávání:</label>
                    <input type="range" id="voice-confidence" min="0.3" max="0.9" step="0.1" value="${this.confidence}">
                    <span class="confidence-value">${Math.round(this.confidence * 100)}%</span>
                </div>
                
                <div class="setting-group">
                    <label for="voice-language">Jazyk:</label>
                    <select id="voice-language">
                        <option value="cs-CZ" ${this.language === 'cs-CZ' ? 'selected' : ''}>Čeština</option>
                        <option value="en-US" ${this.language === 'en-US' ? 'selected' : ''}>English (US)</option>
                        <option value="en-GB" ${this.language === 'en-GB' ? 'selected' : ''}>English (UK)</option>
                    </select>
                </div>
                
                <div class="setting-group">
                    <h4>📋 Dostupné příkazy:</h4>
                    <div class="commands-list" id="voice-commands-list"></div>
                </div>
                
                <div class="setting-group">
                    <h4>📊 Historie příkazů:</h4>
                    <div class="command-history" id="voice-command-history"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.settingsPanel);
        
        this.updateCommandsList();
        this.updateCommandHistory();
    }

    updateCommandsList() {
        const commandsList = document.getElementById('voice-commands-list');
        if (!commandsList) return;
        
        const groupedCommands = new Map();
        
        for (const [pattern, command] of this.commands) {
            if (!groupedCommands.has(command.action)) {
                groupedCommands.set(command.action, {
                    description: command.description,
                    patterns: []
                });
            }
            groupedCommands.get(command.action).patterns.push(pattern);
        }
        
        let html = '';
        for (const [action, data] of groupedCommands) {
            html += `
                <div class="command-item">
                    <strong>"${data.patterns[0]}"</strong>
                    <span>${data.description}</span>
                </div>
            `;
        }
        
        commandsList.innerHTML = html;
    }

    updateCommandHistory() {
        const historyDiv = document.getElementById('voice-command-history');
        if (!historyDiv) return;
        
        if (this.commandHistory.length === 0) {
            historyDiv.innerHTML = '<div class="no-history">Zatím žádné příkazy</div>';
            return;
        }
        
        let html = '';
        this.commandHistory.slice(0, 5).forEach(entry => {
            const time = new Date(entry.timestamp).toLocaleTimeString();
            const confidence = Math.round(entry.confidence * 100);
            
            html += `
                <div class="history-item">
                    <span class="history-transcript">"${entry.transcript}"</span>
                    <span class="history-command">${entry.command}</span>
                    <span class="history-meta">${time} (${confidence}%)</span>
                </div>
            `;
        });
        
        historyDiv.innerHTML = html;
    }

    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .voice-control-toggle {
                position: relative;
            }
            
            .voice-control-toggle.active {
                background: rgba(255, 193, 7, 0.2);
                color: #ffc107;
                box-shadow: 0 0 10px rgba(255, 193, 7, 0.5);
            }
            
            /* 🆕 Styl pro help button */
            .voice-help-button {
                background: rgba(0, 123, 255, 0.1);
                border: 1px solid rgba(0, 123, 255, 0.3);
                color: #007bff;
                transition: all 0.3s ease;
            }
            
            .voice-help-button:hover {
                background: rgba(0, 123, 255, 0.2);
                color: #0056b3;
                box-shadow: 0 0 8px rgba(0, 123, 255, 0.4);
                transform: translateY(-1px);
            }
            
            .voice-help-button:active {
                transform: translateY(0);
            }
            
            .voice-status-indicator {
                position: absolute;
                top: 2px;
                right: 2px;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #666;
                transition: all 0.3s ease;
            }
            
            .voice-status-indicator.listening {
                background: #28a745;
                animation: voicePulse 1.5s ease-in-out infinite;
            }
            
            .voice-status-indicator.processing {
                background: #ffc107;
                animation: voiceProcessing 0.5s ease-in-out infinite alternate;
            }
            
            .voice-status-indicator.error {
                background: #dc3545;
                animation: voiceError 0.2s ease-in-out 3;
            }
            
            .voice-status-indicator.command-executed {
                background: #00d4ff;
                animation: voiceSuccess 0.3s ease-in-out;
            }
            
            @keyframes voicePulse {
                0%, 100% { opacity: 0.5; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.2); }
            }
            
            @keyframes voiceProcessing {
                0% { opacity: 0.7; }
                100% { opacity: 1; }
            }
            
            @keyframes voiceError {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.3); }
            }
            
            @keyframes voiceSuccess {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.5); opacity: 0.8; }
                100% { transform: scale(1); opacity: 1; }
            }
            
            .voice-settings-panel {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 500px;
                max-width: 90vw;
                max-height: 80vh;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 2px solid #ffc107;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(255, 193, 7, 0.3);
                backdrop-filter: blur(10px);
                z-index: 1001;
                overflow: hidden;
                font-family: 'Orbitron', monospace;
            }
            
            .voice-settings-panel.hidden {
                display: none;
            }
            
            .voice-settings-header {
                background: linear-gradient(90deg, #ffc107 0%, #ff9800 100%);
                padding: 12px 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                color: #000;
            }
            
            .voice-settings-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: bold;
            }
            
            .close-settings {
                background: none;
                border: none;
                color: #000;
                font-size: 18px;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 4px;
                transition: background 0.2s ease;
            }
            
            .close-settings:hover {
                background: rgba(0, 0, 0, 0.1);
            }
            
            .voice-settings-content {
                padding: 20px;
                max-height: 60vh;
                overflow-y: auto;
            }
            
            .setting-group {
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid rgba(255, 193, 7, 0.2);
            }
            
            .setting-group:last-child {
                border-bottom: none;
            }
            
            .setting-group label {
                display: flex;
                align-items: center;
                color: #ffc107;
                font-weight: bold;
                margin-bottom: 8px;
                gap: 8px;
            }
            
            .setting-group input[type="checkbox"] {
                width: 16px;
                height: 16px;
            }
            
            .setting-group input[type="range"] {
                width: 200px;
                margin: 0 10px;
            }
            
            .setting-group select {
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 193, 7, 0.3);
                color: #fff;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 14px;
            }
            
            .setting-group small {
                color: #999;
                font-size: 12px;
                display: block;
                margin-top: 4px;
            }
            
            .confidence-value {
                color: #ffc107;
                font-weight: bold;
                min-width: 40px;
                display: inline-block;
            }
            
            .commands-list {
                max-height: 200px;
                overflow-y: auto;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 6px;
                padding: 10px;
            }
            
            .command-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid rgba(255, 193, 7, 0.1);
                font-size: 14px;
            }
            
            .command-item:last-child {
                border-bottom: none;
            }
            
            .command-item strong {
                color: #ffc107;
                font-family: monospace;
                min-width: 140px;
            }
            
            .command-item span {
                color: #ccc;
                flex: 1;
                text-align: right;
            }
            
            .command-history {
                max-height: 150px;
                overflow-y: auto;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 6px;
                padding: 10px;
            }
            
            .history-item {
                display: flex;
                flex-direction: column;
                padding: 8px 0;
                border-bottom: 1px solid rgba(255, 193, 7, 0.1);
                font-size: 13px;
            }
            
            .history-item:last-child {
                border-bottom: none;
            }
            
            .history-transcript {
                color: #ffc107;
                font-family: monospace;
                font-weight: bold;
            }
            
            .history-command {
                color: #28a745;
                margin: 2px 0;
            }
            
            .history-meta {
                color: #666;
                font-size: 11px;
            }
            
            .no-history {
                text-align: center;
                color: #666;
                font-style: italic;
                padding: 20px;
            }
            
            /* Mobile responsivita */
            @media (max-width: 768px) {
                .voice-settings-panel {
                    width: 95vw;
                    max-height: 85vh;
                }
                
                .voice-settings-content {
                    padding: 15px;
                }
                
                .setting-group input[type="range"] {
                    width: 150px;
                }
                
                .command-item {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 4px;
                }
                
                .command-item span {
                    text-align: left;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    attachEventListeners() {
        // Toggle voice control
        this.toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // 🆕 Help button event listener
        this.helpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showSettings();
        });

        // Settings panel events
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-settings')) {
                this.hideSettings();
            }
        });

        // Settings změny
        document.addEventListener('change', (e) => {
            if (e.target.id === 'voice-responses-toggle') {
                this.voiceResponses = e.target.checked;
                this.saveSettings();
            }
            
            if (e.target.id === 'audio-prevention-toggle') {
                this.audioPreventionActive = e.target.checked;
                this.saveSettings();
                this.showNotification(
                    this.audioPreventionActive ? 
                    '🎵 Ochrana před pauzováním aktivována' : 
                    '⏸️ Ochrana před pauzováním deaktivována', 
                    'info'
                );
            }
            
            if (e.target.id === 'voice-confidence') {
                this.confidence = parseFloat(e.target.value);
                document.querySelector('.confidence-value').textContent = 
                    Math.round(this.confidence * 100) + '%';
                this.saveSettings();
            }
            
            if (e.target.id === 'voice-language') {
                this.language = e.target.value;
                this.currentLanguage = this.language;
                if (this.recognition) {
                    this.recognition.lang = this.currentLanguage;
                }
                this.saveSettings();
                this.showNotification(`Jazyk změněn na ${e.target.value}`, 'info');
            }
        });

        // Klávesové zkratky
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.ctrlKey && e.key === 'v') {
                e.preventDefault();
                this.toggle();
            }

            if (e.key === 'h' && e.ctrlKey) { // 🆕 Ctrl+H pro help
                e.preventDefault();
                this.showSettings();
            }

            if (e.key === 'Escape' && !this.settingsPanel.classList.contains('hidden')) {
                this.hideSettings();
            }
        });

        // Double-click pro rychlé nastavení
        this.toggleBtn.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.showSettings();
        });

        // Klik mimo settings panel
        document.addEventListener('click', (e) => {
            if (!this.settingsPanel.classList.contains('hidden') && 
                !this.settingsPanel.contains(e.target) && 
                e.target !== this.toggleBtn && 
                e.target !== this.helpBtn) { // 🆕 Přidáno help button
                this.hideSettings();
            }
        });

        // Sledování změn tracku pro voice announcements
        document.addEventListener('audioTrackChanged', (e) => {
            if (this.voiceResponses && this.isEnabled && e.detail?.trackTitle) {
                setTimeout(() => {
                    this.speak(`Přehrávám: ${e.detail.trackTitle}`);
                }, 1000);
            }
        });

        if (DEBUG_VOICE) console.log("🎤 Event listeners attached");
    }

    updateStatusIndicator(status = 'inactive') {
        if (!this.statusIndicator) return;
        
        // Reset všechny třídy
        this.statusIndicator.className = 'voice-status-indicator';
        
        // Přidat novou třídu
        if (status !== 'inactive') {
            this.statusIndicator.classList.add(status);
        }
    }

    toggle() {
        if (this.isEnabled) {
            this.disable();
        } else {
            this.enable();
        }
    }

    async enable() {
        try {
            // Požádat o přístup k mikrofonu
            await navigator.mediaDevices.getUserMedia({ audio: true });
            
            this.isEnabled = true;
            this.toggleBtn.classList.add('active');
            this.toggleBtn.title = 'Hlasové ovládání AKTIVNÍ (Ctrl+V)';
            
            this.startListening();
            this.saveSettings();
            
            this.showNotification("🎤 Hlasové ovládání aktivováno", 'success');
            this.speak("Hlasové ovládání aktivováno. Jsem připraven přijímat příkazy.");
            
            if (DEBUG_VOICE) console.log("🎤 Voice control enabled");
            
        } catch (error) {
            console.error("🎤 Failed to enable voice control:", error);
            this.showNotification("Nelze aktivovat mikrofon: " + error.message, 'error');
            this.updateStatusIndicator('error');
        }
    }

    disable() {
        this.isEnabled = false;
        this.stopListening();
        
        this.toggleBtn.classList.remove('active');
        this.toggleBtn.title = 'Hlasové ovládání (Ctrl+V)';
        this.updateStatusIndicator('inactive');
        
        this.saveSettings();
        this.showNotification("🎤 Hlasové ovládání deaktivováno", 'info');
        
        if (DEBUG_VOICE) console.log("🎤 Voice control disabled");
    }

    startListening() {
        if (!this.recognition || this.isListening) return;
        
        try {
            this.recognition.start();
        } catch (error) {
            console.error("🎤 Failed to start listening:", error);
            this.updateStatusIndicator('error');
        }
    }

    stopListening() {
        if (!this.recognition || !this.isListening) return;
        
        try {
            this.recognition.stop();
        } catch (error) {
            console.error("🎤 Failed to stop listening:", error);
        }
    }

    showSettings() {
        this.settingsPanel.classList.remove('hidden');
        this.updateCommandsList();
        this.updateCommandHistory();
        
        if (DEBUG_VOICE) console.log("🎤 Settings shown");
    }

    hideSettings() {
        this.settingsPanel.classList.add('hidden');
        
        if (DEBUG_VOICE) console.log("🎤 Settings hidden");
    }

    showNotification(message, type = 'info', duration = 3000) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type, duration);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // Data persistence
    async saveSettings() {
        const settings = {
            isEnabled: this.isEnabled,
            voiceResponses: this.voiceResponses,
            confidence: this.confidence,
            language: this.language,
            audioPreventionActive: this.audioPreventionActive, // 🆕 Nové nastavení
            timestamp: Date.now()
        };

        localStorage.setItem('voiceControlSettings', JSON.stringify(settings));

        try {
            if (typeof window.saveVoiceSettingsToFirestore === 'function') {
                await window.saveVoiceSettingsToFirestore(settings);
            }
        } catch (error) {
            console.warn("VoiceController: Firestore save failed:", error);
        }

        if (DEBUG_VOICE) {
            console.log("🎤 Settings saved:", settings);
        }
    }

    async loadSettings() {
        try {
            // Try Firestore first
            if (typeof window.loadVoiceSettingsFromFirestore === 'function') {
                const firestoreSettings = await window.loadVoiceSettingsFromFirestore();
                if (firestoreSettings) {
                    this.applySettings(firestoreSettings);
                    if (DEBUG_VOICE) console.log("🎤 Settings loaded from Firestore");
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
                if (DEBUG_VOICE) console.log("🎤 Settings loaded from localStorage");
            } catch (error) {
                console.error("VoiceController: Failed to parse saved settings:", error);
            }
        }
    }

    applySettings(settings) {
        this.isEnabled = settings.isEnabled ?? false;
        this.voiceResponses = settings.voiceResponses ?? true;
        this.confidence = settings.confidence ?? 0.7;
        this.language = settings.language ?? 'cs-CZ';
        this.audioPreventionActive = settings.audioPreventionActive ?? true; // 🆕 Default zapnuto
        this.currentLanguage = this.language;
    }

    // Export/Import functions
    exportSettings() {
        const data = {
            settings: {
                isEnabled: this.isEnabled,
                voiceResponses: this.voiceResponses,
                confidence: this.confidence,
                language: this.language,
                audioPreventionActive: this.audioPreventionActive // 🆕 Export nastavení
            },
            commandHistory: this.commandHistory,
            timestamp: Date.now(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `voice-control-settings-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('📁 Nastavení hlasového ovládání exportována', 'success');
    }

    // API pro externí použití
    addCustomCommand(patterns, action, description, callback) {
        if (!Array.isArray(patterns) || typeof callback !== 'function') {
            console.error("VoiceController: Invalid custom command parameters");
            return false;
        }

        patterns.forEach(pattern => {
            this.commands.set(pattern.toLowerCase(), {
                action,
                description,
                callback,
                custom: true
            });
        });

        this.updateCommandsList();
        return true;
    }

    removeCustomCommand(action) {
        for (const [pattern, command] of this.commands) {
            if (command.action === action && command.custom) {
                this.commands.delete(pattern);
            }
        }
        this.updateCommandsList();
    }

    getCommandHistory() {
        return [...this.commandHistory];
    }

    clearCommandHistory() {
        this.commandHistory = [];
        this.updateCommandHistory();
        this.showNotification('🗑️ Historie příkazů vymazána', 'info');
    }

    // Testovací funkce
    testVoiceRecognition() {
        if (!this.recognition) {
            this.showNotification('Hlasové rozpoznávání není dostupné', 'error');
            return;
        }

        this.speak("Testování hlasového rozpoznávání. Řekněte něco.");
        
        const testRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        testRecognition.continuous = false;
        testRecognition.interimResults = false;
        testRecognition.lang = this.currentLanguage;
        
        testRecognition.onresult = (event) => {
            const result = event.results[0][0];
            this.showNotification(
                `Test úspěšný: "${result.transcript}" (${Math.round(result.confidence * 100)}%)`, 
                'success'
            );
            this.speak(`Rozpoznáno: ${result.transcript}`);
        };
        
        testRecognition.onerror = (event) => {
            this.showNotification(`Test selhal: ${event.error}`, 'error');
        };
        
        testRecognition.start();
    }
}

// Globální inicializace
let voiceController;

// Auto-inicializace po DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        voiceController = new VoiceController();
        window.voiceController = voiceController; // Global access
    });
} else {
    voiceController = new VoiceController();
    window.voiceController = voiceController;
}

// Export pro ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceController;
}
