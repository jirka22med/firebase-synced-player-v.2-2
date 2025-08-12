/**
 * 🖖 STAR TREK VOICE CONTROL MODULE - VERZE 2.0 VYLEPŠENÁ
 * Více admirále Jiříku & Admiral Claude
 * "Computer, engage!" - Vylepšené voice commands pro audio přehrávač
 */

const DEBUG_VOICE = true; // Zapni debug pro testování

class EnhancedVoiceController {
    constructor() {
        // Inicializace proměnných
        this.recognition = null;
        this.isListening = false;
        this.isEnabled = false;
        this.confidence = 0.5; // Snížená minimální jistota pro lepší detekci
        this.language = 'cs-CZ';
        this.fallbackLanguage = 'en-US';
        this.currentLanguage = this.language;
        
        // DOM elementy
        this.toggleBtn = null;
        this.helpBtn = null;
        this.statusIndicator = null;
        this.settingsPanel = null;
        this.debugPanel = null;
        
        // Hlasové odpovědi
        this.voiceResponses = true;
        this.responseVoice = null;
        this.speechQueue = [];
        this.isSpeaking = false;
        
        // Správa audia - vylepšeno
        this.wasPlayingBeforeRecognition = false;
        this.audioPreventionActive = true;
        this.lastCommandWasPause = false;
        this.commandInProgress = false;
        this.recognitionAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        // Vylepšené příkazy s fuzzy matching
        this.commands = [];
        this.commandAliases = new Map();
        this.lastCommand = null;
        this.commandHistory = [];
        this.recentFailures = [];
        
        // Nové vlastnosti pro stabilitu
        this.restartTimer = null;
        this.lastRestartTime = 0;
        this.minRestartInterval = 2000;
        this.isRestarting = false;
        
        // Detekce mobilního zařízení
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        this.init();
    }

    // Vylepšená inicializace
    async init() {
        if (DEBUG_VOICE) console.log("🎤 EnhancedVoiceController: Inicializace modulu v2.0");
        
        if (!this.checkBrowserSupport()) {
            this.showNotification("Váš prohlížeč nepodporuje rozpoznávání řeči", 'error');
            return;
        }
        
        await this.loadSettings();
        this.setupEnhancedCommands();
        this.createEnhancedUI();
        this.setupRobustRecognition();
        this.attachEventListeners();
        this.injectEnhancedStyles();
        
        if (this.isEnabled) {
            this.startListening();
        }
        
        // Přidáme sledování kvality rozpoznávání
        this.startQualityMonitoring();
    }

    // Kontroluje podporu s detailnějšími informacemi
    checkBrowserSupport() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const hasSpeechSynthesis = 'speechSynthesis' in window;
        
        if (!SpeechRecognition) {
            console.error("VoiceController: Speech Recognition není podporováno");
            return false;
        }
        
        if (DEBUG_VOICE) {
            console.log("🎤 Podpora prohlížeče:");
            console.log("- SpeechRecognition:", !!SpeechRecognition);
            console.log("- SpeechSynthesis:", hasSpeechSynthesis);
            console.log("- User Agent:", navigator.userAgent);
        }
        
        return true;
    }

    // Vylepšené příkazy s více variantami a fuzzy matching
    setupEnhancedCommands() {
        const enhancedCommands = [
            // Základní ovládání - více variant
            { 
                patterns: ['přehrát', 'play', 'spustit', 'start', 'zapni', 'začni', 'pustit', 'hraj'], 
                action: 'play', 
                description: 'Spustí přehrávání',
                fuzzy: ['prehrat', 'prehra', 'spust', 'zapnout']
            },
            { 
                patterns: ['pauza', 'pause', 'pozastavit', 'stop', 'stoj', 'zastav', 'pozastav', 'přestaň'], 
                action: 'pause', 
                description: 'Pozastaví přehrávání',
                fuzzy: ['pauze', 'pozastat', 'stopit']
            },
            { 
                patterns: ['další', 'next', 'následující', 'skip', 'dalsi', 'skipni', 'přeskoč'], 
                action: 'next', 
                description: 'Další skladba',
                fuzzy: ['nasledujici', 'preskoc']
            },
            { 
                patterns: ['předchozí', 'previous', 'předešlá', 'back', 'zpět', 'predchozi'], 
                action: 'previous', 
                description: 'Předchozí skladba',
                fuzzy: ['predesla', 'zpet']
            },
            { 
                patterns: ['restart', 'znovu', 'od začátku', 'reset', 'zacatek'], 
                action: 'restart', 
                description: 'Restart skladby',
                fuzzy: ['od zacatku']
            },
            
            // Hlasitost - rozšířeno
            { 
                patterns: ['hlasitost nahoru', 'volume up', 'zesilte', 'louder', 'hlasiteji', 'vic'], 
                action: 'volumeUp', 
                description: 'Zvýší hlasitost',
                fuzzy: ['hlasitost nahorů', 'hlasiteji']
            },
            { 
                patterns: ['hlasitost dolů', 'volume down', 'ztiště', 'quieter', 'tišeji', 'míň'], 
                action: 'volumeDown', 
                description: 'Sníží hlasitost',
                fuzzy: ['hlasitost dolu', 'tiseji', 'min']
            },
            { 
                patterns: ['ztlumit', 'mute', 'ticho', 'silence', 'vypni zvuk'], 
                action: 'mute', 
                description: 'Ztlumí zvuk',
                fuzzy: ['ztlum']
            },
            { 
                patterns: ['zrušit ztlumení', 'unmute', 'sound on', 'zapni zvuk', 'obnovit zvuk'], 
                action: 'unmute', 
                description: 'Zruší ztlumení',
                fuzzy: ['zrusit ztlumeni', 'obnov zvuk']
            },
            
            // Nové jednoduché příkazy
            { 
                patterns: ['help', 'nápověda', 'příkazy', 'commands', 'pomoc'], 
                action: 'showHelp', 
                description: 'Zobrazí dostupné příkazy',
                fuzzy: ['napoveda', 'prikazy']
            },
            { 
                patterns: ['vypni hlas', 'voice off', 'stop listening', 'konec', 'stačí', 'hotovo'], 
                action: 'disableVoice', 
                description: 'Vypne hlasové ovládání',
                fuzzy: ['staci']
            },
            
            // Star Trek příkazy
            { 
                patterns: ['computer', 'počítač', 'engage'], 
                action: 'acknowledge', 
                description: 'Potvrzení připravenosti',
                fuzzy: ['pocitac']
            },
            { 
                patterns: ['co hraje', 'aktuální skladba', 'what playing'], 
                action: 'getCurrentTrack', 
                description: 'Oznámí aktuální skladbu',
                fuzzy: ['co hraj', 'aktualni skladba']
            }
        ];

        // Vytvoříme mapu aliasů pro rychlé vyhledávání
        this.commandAliases.clear();
        
        enhancedCommands.forEach(cmd => {
            // Standardní patterns
            cmd.patterns.forEach(pattern => {
                this.commands.push({
                    regex: new RegExp(`\\b${this.escapeRegExp(pattern)}\\b`, 'i'),
                    fuzzyRegex: new RegExp(this.escapeRegExp(pattern).replace(/./g, '$&.*?'), 'i'),
                    action: cmd.action,
                    description: cmd.description,
                    pattern,
                    originalPattern: pattern
                });
                
                this.commandAliases.set(pattern.toLowerCase(), cmd.action);
            });
            
            // Fuzzy patterns pro čestinu s diakritikou
            if (cmd.fuzzy) {
                cmd.fuzzy.forEach(fuzzyPattern => {
                    this.commands.push({
                        regex: new RegExp(`\\b${this.escapeRegExp(fuzzyPattern)}\\b`, 'i'),
                        fuzzyRegex: new RegExp(this.escapeRegExp(fuzzyPattern).replace(/./g, '$&.*?'), 'i'),
                        action: cmd.action,
                        description: cmd.description,
                        pattern: fuzzyPattern,
                        originalPattern: fuzzyPattern,
                        isFuzzy: true
                    });
                    
                    this.commandAliases.set(fuzzyPattern.toLowerCase(), cmd.action);
                });
            }
        });

        if (DEBUG_VOICE) {
            console.log("🎤 Enhanced commands loaded:", this.commands.length);
            console.log("🎤 Command aliases:", this.commandAliases.size);
        }
    }

    // Helper funkce pro escapování RegExp
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Robustnější rozpoznávání řeči
    setupRobustRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Optimalizované nastavení pro českou řeč
        this.recognition.continuous = true;
        this.recognition.interimResults = true; // Povolíme interim pro lepší debugging
        this.recognition.lang = this.currentLanguage;
        this.recognition.maxAlternatives = 5; // Více alternativ
        
        this.recognition.onstart = () => {
            this.isListening = true;
            this.isRestarting = false;
            this.recognitionAttempts = 0;
            this.updateStatusIndicator('listening');
            
            if (DEBUG_VOICE) console.log("🎤 Voice recognition started successfully");
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            this.updateStatusIndicator('inactive');
            
            if (DEBUG_VOICE) {
                console.log("🎤 Voice recognition ended, enabled:", this.isEnabled, "restarting:", this.isRestarting);
            }
            
            // Robustnější restart logika
            if (this.isEnabled && !this.isSpeaking && !this.isRestarting) {
                this.scheduleRestart();
            }
        };
        
        this.recognition.onerror = (event) => {
            const error = event.error;
            
            if (DEBUG_VOICE) {
                console.log(`🎤 Recognition error: ${error}`, event);
            }
            
            // Seznam benigních chyb, které můžeme ignorovat
            const benignErrors = ['no-speech', 'aborted'];
            if (benignErrors.includes(error)) {
                return;
            }
            
            // Vážnější chyby
            if (error === 'not-allowed') {
                this.showNotification("❌ Přístup k mikrofonu byl odepřen", 'error');
                this.disable();
                return;
            }
            
            if (error === 'network') {
                this.showNotification("🌐 Problém se sítí, zkouším znovu", 'warn');
                this.scheduleRestart(3000);
                return;
            }
            
            // Audio capture chyby
            if (error === 'audio-capture') {
                this.recognitionAttempts++;
                if (this.recognitionAttempts < this.maxReconnectAttempts) {
                    this.showNotification("🎤 Problém s mikrofonem, reconnecting...", 'warn');
                    this.scheduleRestart(2000);
                } else {
                    this.showNotification("❌ Opakované problémy s mikrofonem", 'error');
                    this.disable();
                }
                return;
            }
            
            this.updateStatusIndicator('error');
        };
        
        this.recognition.onresult = (event) => {
            // Zpracování všech výsledků včetně interim
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const transcript = result[0].transcript.trim().toLowerCase();
                const confidence = result[0].confidence || 0;
                
                if (DEBUG_VOICE) {
                    console.log(`🎤 ${result.isFinal ? 'FINAL' : 'INTERIM'}:`, transcript, `(${Math.round(confidence * 100)}%)`);
                    
                    // Zobrazíme všechny alternativy
                    if (result.length > 1) {
                        console.log("🎤 Alternatives:", Array.from(result).map(r => `"${r.transcript}" (${Math.round(r.confidence * 100)}%)`));
                    }
                }
                
                if (result.isFinal) {
                    this.processEnhancedCommand(transcript, confidence, result);
                }
            }
        };
        
        // Načítání hlasů
        if ('speechSynthesis' in window) {
            this.loadVoices();
            window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
        }
    }

    // Vylepšené zpracování příkazů s fuzzy matching
    processEnhancedCommand(transcript, confidence, allResults) {
        // Přidáme do debug panelu
        this.addToDebugLog('input', transcript, confidence);
        
        let bestMatch = null;
        let matchScore = 0;
        let matchMethod = '';
        
        // Zkusíme všechny alternativy z rozpoznávání
        const alternatives = Array.from(allResults).map(r => ({
            text: r.transcript.trim().toLowerCase(),
            confidence: r.confidence || 0
        }));
        
        for (const alt of alternatives) {
            const match = this.findBestCommand(alt.text, alt.confidence);
            if (match && match.score > matchScore) {
                bestMatch = match;
                matchScore = match.score;
            }
        }
        
        if (bestMatch && matchScore > 0.3) { // Nižší práh pro akceptaci
            this.updateStatusIndicator('processing');
            this.executeCommand(bestMatch.command, transcript, confidence);
            this.addToDebugLog('match', `${bestMatch.command.action} (${bestMatch.method}, score: ${matchScore.toFixed(2)})`, confidence);
            
            // Přidáme do historie
            this.commandHistory.unshift({
                transcript,
                command: bestMatch.command.action,
                confidence,
                matchScore,
                method: bestMatch.method,
                timestamp: Date.now()
            });
            
            if (this.commandHistory.length > 50) {
                this.commandHistory = this.commandHistory.slice(0, 50);
            }
        } else {
            // Přidáme failed attempt pro analýzu
            this.recentFailures.push({
                transcript,
                confidence,
                alternatives: alternatives,
                timestamp: Date.now()
            });
            
            if (this.recentFailures.length > 20) {
                this.recentFailures = this.recentFailures.slice(0, 20);
            }
            
            this.addToDebugLog('fail', transcript, confidence);
            
            if (DEBUG_VOICE) {
                console.log("🎤 No command matched for:", transcript);
                console.log("🎤 Best score was:", matchScore);
            }
            
            // Inteligentní odpověď na základě podobnosti
            if (matchScore > 0.2) {
                this.speak("Skoro jsem pochopil, zkuste to prosím znovu");
            } else {
                this.speak("Nerozumím tomuto příkazu");
            }
        }
    }

    // Nová funkce pro hledání nejlepšího příkazu
    findBestCommand(transcript, confidence) {
        let bestCommand = null;
        let bestScore = 0;
        let bestMethod = '';
        
        // 1. Exact match
        for (const command of this.commands) {
            if (command.regex.test(transcript)) {
                const score = confidence * 1.0; // Plná váha pro exact match
                if (score > bestScore) {
                    bestCommand = command;
                    bestScore = score;
                    bestMethod = 'exact';
                }
            }
        }
        
        // 2. Contains match (obsahuje klíčové slovo)
        if (!bestCommand || bestScore < 0.8) {
            for (const command of this.commands) {
                if (transcript.includes(command.pattern.toLowerCase())) {
                    const score = confidence * 0.8;
                    if (score > bestScore) {
                        bestCommand = command;
                        bestScore = score;
                        bestMethod = 'contains';
                    }
                }
            }
        }
        
        // 3. Fuzzy match (editační vzdálenost)
        if (!bestCommand || bestScore < 0.6) {
            for (const command of this.commands) {
                const similarity = this.calculateSimilarity(transcript, command.pattern.toLowerCase());
                const score = confidence * similarity * 0.6;
                if (score > bestScore && similarity > 0.5) {
                    bestCommand = command;
                    bestScore = score;
                    bestMethod = 'fuzzy';
                }
            }
        }
        
        // 4. Obsahuje částečnou shodu (pro složené příkazy)
        if (!bestCommand || bestScore < 0.4) {
            const words = transcript.split(' ');
            for (const command of this.commands) {
                const commandWords = command.pattern.toLowerCase().split(' ');
                let matchingWords = 0;
                
                for (const word of words) {
                    for (const cmdWord of commandWords) {
                        if (word.includes(cmdWord) || cmdWord.includes(word)) {
                            matchingWords++;
                        }
                    }
                }
                
                if (matchingWords > 0) {
                    const wordScore = matchingWords / Math.max(words.length, commandWords.length);
                    const score = confidence * wordScore * 0.4;
                    if (score > bestScore) {
                        bestCommand = command;
                        bestScore = score;
                        bestMethod = 'partial';
                    }
                }
            }
        }
        
        if (DEBUG_VOICE && bestCommand) {
            console.log(`🎤 Best match: "${bestCommand.pattern}" via ${bestMethod} (score: ${bestScore.toFixed(2)})`);
        }
        
        return bestCommand ? { command: bestCommand, score: bestScore, method: bestMethod } : null;
    }

    // Výpočet similarity mezi dvěma strings (Levenshtein distance)
    calculateSimilarity(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        const matrix = Array(len2 + 1).fill().map(() => Array(len1 + 1).fill(0));
        
        for (let i = 0; i <= len1; i++) matrix[0][i] = i;
        for (let j = 0; j <= len2; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= len2; j++) {
            for (let i = 1; i <= len1; i++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + cost
                );
            }
        }
        
        const maxLen = Math.max(len1, len2);
        return maxLen === 0 ? 1 : 1 - (matrix[len2][len1] / maxLen);
    }

    // Inteligentní restart s debouncing
    scheduleRestart(delay = 1500) {
        if (this.restartTimer) {
            clearTimeout(this.restartTimer);
        }
        
        const now = Date.now();
        const timeSinceLastRestart = now - this.lastRestartTime;
        
        if (timeSinceLastRestart < this.minRestartInterval) {
            delay = this.minRestartInterval - timeSinceLastRestart + delay;
        }
        
        this.restartTimer = setTimeout(() => {
            if (this.isEnabled && !this.isListening && !this.isSpeaking) {
                this.lastRestartTime = Date.now();
                this.isRestarting = true;
                this.startListening();
            }
        }, delay);
        
        if (DEBUG_VOICE) console.log(`🎤 Restart scheduled in ${delay}ms`);
    }

    // Vylepšené UI s debug panelem
    createEnhancedUI() {
        // Hlavní tlačítko
        this.toggleBtn = document.createElement('button');
        this.toggleBtn.id = 'voice-control-toggle';
        this.toggleBtn.className = 'control-button voice-control-toggle enhanced';
        this.toggleBtn.title = 'Hlasové ovládání v2.0 (Ctrl+V)';
        this.toggleBtn.innerHTML = '🎤';
        
        this.statusIndicator = document.createElement('div');
        this.statusIndicator.className = 'voice-status-indicator enhanced';
        this.toggleBtn.appendChild(this.statusIndicator);
        
        // Debug tlačítko
        this.helpBtn = document.createElement('button');
        this.helpBtn.id = 'voice-debug-panel';
        this.helpBtn.className = 'control-button voice-debug-button';
        this.helpBtn.title = 'Debug panel (D)';
        this.helpBtn.innerHTML = '🔧';
        
        const controlsDiv = document.querySelector('#control-panel .controls');
        if (controlsDiv) {
            controlsDiv.appendChild(this.toggleBtn);
            controlsDiv.appendChild(this.helpBtn);
        }

        this.createDebugPanel();
        this.createSettingsPanel();
        
        if (DEBUG_VOICE) console.log("🎤 Enhanced UI created");
    }

    // Debug panel pro real-time monitoring
    createDebugPanel() {
        this.debugPanel = document.createElement('div');
        this.debugPanel.id = 'voice-debug-panel';
        this.debugPanel.className = 'voice-debug-panel hidden';
        
        this.debugPanel.innerHTML = `
            <div class="debug-header">
                <h3>🔧 Hlasové ovládání - Debug</h3>
                <div class="debug-controls">
                    <button id="clear-debug">🗑️ Vyčistit</button>
                    <button id="export-debug">📁 Export</button>
                    <button class="close-debug">✕</button>
                </div>
            </div>
            
            <div class="debug-content">
                <div class="debug-section">
                    <h4>📊 Real-time Status</h4>
                    <div class="status-grid">
                        <div>Stav: <span id="debug-status">Neaktivní</span></div>
                        <div>Jazyk: <span id="debug-language">${this.currentLanguage}</span></div>
                        <div>Confidence práh: <span id="debug-confidence">${this.confidence}</span></div>
                        <div>Pokusy o restart: <span id="debug-attempts">0</span></div>
                    </div>
                </div>
                
                <div class="debug-section">
                    <h4>🎤 Rozpoznávání (Real-time)</h4>
                    <div id="debug-log" class="debug-log"></div>
                </div>
                
                <div class="debug-section">
                    <h4>❌ Neúspěšné pokusy</h4>
                    <div id="debug-failures" class="debug-failures"></div>
                </div>
                
                <div class="debug-section">
                    <h4>⚙️ Rychlé akce</h4>
                    <div class="debug-actions">
                        <button id="test-voice">🧪 Test rozpoznávání</button>
                        <button id="test-speech">🔊 Test hlasu</button>
                        <button id="reset-voice">🔄 Reset systému</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.debugPanel);
    }

    // Přidání do debug logu
    addToDebugLog(type, message, confidence = 0) {
        const debugLog = document.getElementById('debug-log');
        if (!debugLog) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = `debug-entry debug-${type}`;
        
        let icon = '';
        switch (type) {
            case 'input': icon = '🎤'; break;
            case 'match': icon = '✅'; break;
            case 'fail': icon = '❌'; break;
            default: icon = 'ℹ️';
        }
        
        entry.innerHTML = `
            <span class="debug-time">${timestamp}</span>
            <span class="debug-icon">${icon}</span>
            <span class="debug-message">${message}</span>
            ${confidence > 0 ? `<span class="debug-confidence">${Math.round(confidence * 100)}%</span>` : ''}
        `;
        
        debugLog.insertBefore(entry, debugLog.firstChild);
        
        // Omez na 50 záznamů
        while (debugLog.children.length > 50) {
            debugLog.removeChild(debugLog.lastChild);
        }
        
        this.updateDebugStats();
    }

    // Aktualizace debug statistik
    updateDebugStats() {
        const statusEl = document.getElementById('debug-status');
        const attemptsEl = document.getElementById('debug-attempts');
        const languageEl = document.getElementById('debug-language');
        const confidenceEl = document.getElementById('debug-confidence');
        
        if (statusEl) {
            let status = 'Neaktivní';
            if (this.isListening) status = 'Naslouchá';
            else if (this.isEnabled) status = 'Připraveno';
            statusEl.textContent = status;
            statusEl.className = this.isListening ? 'status-active' : 'status-inactive';
        }
        
        if (attemptsEl) attemptsEl.textContent = this.recognitionAttempts;
        if (languageEl) languageEl.textContent = this.currentLanguage;
        if (confidenceEl) confidenceEl.textContent = this.confidence;
        
        // Aktualizuj failures
        const failuresEl = document.getElementById('debug-failures');
        if (failuresEl && this.recentFailures.length > 0) {
            failuresEl.innerHTML = this.recentFailures.slice(0, 10).map(failure => 
                `<div class="failure-item">
                    <span>"${failure.transcript}"</span>
                    <small>${new Date(failure.timestamp).toLocaleTimeString()} (${Math.round(failure.confidence * 100)}%)</small>
                </div>`
            ).join('');
        }
    }

    // Monitoring kvality rozpoznávání
    startQualityMonitoring() {
        setInterval(() => {
            if (this.isEnabled) {
                this.updateDebugStats();
                
                // Statistiky úspěšnosti
                const recentCommands = this.commandHistory.filter(cmd => 
                    Date.now() - cmd.timestamp < 60000 // Posledních 60 sekund
                );
                
                const recentFailuresCount = this.recentFailures.filter(fail => 
                    Date.now() - fail.timestamp < 60000
                ).length;
                
                if (DEBUG_VOICE && (recentCommands.length > 0 || recentFailuresCount > 0)) {
                    const successRate = recentCommands.length / (recentCommands.length + recentFailuresCount);
                    console.log(`🎤 Success rate (60s): ${Math.round(successRate * 100)}% (${recentCommands.length}/${recentCommands.length + recentFailuresCount})`);
                }
            }
        }, 5000);
    }

    // Vylepšené styly
    injectEnhancedStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Enhanced Voice Control Styles */
            .voice-control-toggle.enhanced {
                position: relative;
                transition: all 0.3s ease;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 2px solid #ffc107;
                border-radius: 8px;
                color: #ffc107;
            }
            
            .voice-control-toggle.enhanced.active {
                background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
                color: #000;
                box-shadow: 0 0 20px rgba(255, 193, 7, 0.8);
                transform: scale(1.1);
                animation: voiceGlow 2s ease-in-out infinite;
            }
            
            @keyframes voiceGlow {
                0%, 100% { box-shadow: 0 0 20px rgba(255, 193, 7, 0.8); }
                50% { box-shadow: 0 0 30px rgba(255, 193, 7, 1); }
            }
            
            .voice-debug-button {
                background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                border: 2px solid #007bff;
                border-radius: 8px;
                color: #fff;
                transition: all 0.3s ease;
            }
            
            .voice-debug-button:hover {
                background: linear-gradient(135deg, #0056b3 0%, #004085 100%);
                box-shadow: 0 0 15px rgba(0, 123, 255, 0.6);
                transform: translateY(-2px);
            }
            
            .voice-status-indicator.enhanced {
                position: absolute;
                top: 4px;
                right: 4px;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: #666;
                transition: all 0.3s ease;
                border: 2px solid transparent;
            }
            
            .voice-status-indicator.enhanced.listening {
                background: #28a745;
                border-color: #fff;
                animation: voicePulseEnhanced 1s ease-in-out infinite;
            }
            
            .voice-status-indicator.enhanced.processing {
                background: #ffc107;
                border-color: #fff;
                animation: voiceProcessingEnhanced 0.3s ease-in-out infinite alternate;
            }
            
            .voice-status-indicator.enhanced.error {
                background: #dc3545;
                border-color: #fff;
                animation: voiceErrorEnhanced 0.2s ease-in-out 4;
            }
            
            @keyframes voicePulseEnhanced {
                0%, 100% { 
                    opacity: 0.7; 
                    transform: scale(1); 
                    box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7);
                }
                50% { 
                    opacity: 1; 
                    transform: scale(1.3); 
                    box-shadow: 0 0 0 8px rgba(40, 167, 69, 0);
                }
            }
            
            @keyframes voiceProcessingEnhanced {
                0% { opacity: 0.7; transform: scale(1); }
                100% { opacity: 1; transform: scale(1.2); }
            }
            
            @keyframes voiceErrorEnhanced {
                0%, 100% { transform: scale(1) rotate(0deg); }
                25% { transform: scale(1.3) rotate(-5deg); }
                75% { transform: scale(1.3) rotate(5deg); }
            }
            
            /* Debug Panel Styles */
            .voice-debug-panel {
                position: fixed;
                top: 50px;
                right: 20px;
                width: 450px;
                max-width: calc(100vw - 40px);
                max-height: calc(100vh - 100px);
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 2px solid #007bff;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 123, 255, 0.3);
                backdrop-filter: blur(10px);
                z-index: 1002;
                overflow: hidden;
                font-family: 'Courier New', monospace;
                font-size: 12px;
            }
            
            .voice-debug-panel.hidden {
                display: none;
            }
            
            .debug-header {
                background: linear-gradient(90deg, #007bff 0%, #0056b3 100%);
                padding: 10px 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                color: #fff;
            }
            
            .debug-header h3 {
                margin: 0;
                font-size: 14px;
                font-weight: bold;
            }
            
            .debug-controls {
                display: flex;
                gap: 8px;
            }
            
            .debug-controls button {
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: #fff;
                padding: 4px 8px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
                transition: all 0.2s ease;
            }
            
            .debug-controls button:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            .debug-content {
                padding: 15px;
                max-height: calc(100vh - 200px);
                overflow-y: auto;
            }
            
            .debug-section {
                margin-bottom: 15px;
                padding: 10px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 6px;
                border-left: 3px solid #007bff;
            }
            
            .debug-section h4 {
                margin: 0 0 8px 0;
                color: #007bff;
                font-size: 13px;
                font-weight: bold;
            }
            
            .status-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                color: #ccc;
                font-size: 11px;
            }
            
            .status-active {
                color: #28a745 !important;
                font-weight: bold;
            }
            
            .status-inactive {
                color: #6c757d !important;
            }
            
            .debug-log {
                max-height: 200px;
                overflow-y: auto;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 4px;
                padding: 8px;
            }
            
            .debug-entry {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 4px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                font-size: 11px;
            }
            
            .debug-entry:last-child {
                border-bottom: none;
            }
            
            .debug-time {
                color: #6c757d;
                min-width: 60px;
                font-size: 10px;
            }
            
            .debug-icon {
                min-width: 16px;
                text-align: center;
            }
            
            .debug-message {
                flex: 1;
                color: #fff;
            }
            
            .debug-confidence {
                color: #ffc107;
                font-weight: bold;
                min-width: 40px;
                text-align: right;
                font-size: 10px;
            }
            
            .debug-input {
                background: rgba(0, 123, 255, 0.1);
                border-left: 3px solid #007bff;
                padding-left: 8px;
            }
            
            .debug-match {
                background: rgba(40, 167, 69, 0.1);
                border-left: 3px solid #28a745;
                padding-left: 8px;
            }
            
            .debug-fail {
                background: rgba(220, 53, 69, 0.1);
                border-left: 3px solid #dc3545;
                padding-left: 8px;
            }
            
            .debug-failures {
                max-height: 150px;
                overflow-y: auto;
                background: rgba(220, 53, 69, 0.1);
                border-radius: 4px;
                padding: 8px;
            }
            
            .failure-item {
                padding: 4px 0;
                border-bottom: 1px solid rgba(220, 53, 69, 0.2);
                color: #ffcccc;
                font-size: 11px;
            }
            
            .failure-item:last-child {
                border-bottom: none;
            }
            
            .failure-item small {
                color: #dc3545;
                display: block;
                margin-top: 2px;
                font-size: 10px;
            }
            
            .debug-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            
            .debug-actions button {
                background: rgba(0, 123, 255, 0.2);
                border: 1px solid rgba(0, 123, 255, 0.4);
                color: #007bff;
                padding: 6px 12px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 11px;
                transition: all 0.2s ease;
            }
            
            .debug-actions button:hover {
                background: rgba(0, 123, 255, 0.3);
                color: #fff;
            }
            
            /* Enhanced Settings Panel */
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
            
            /* Responsive Design */
            @media (max-width: 768px) {
                .voice-debug-panel {
                    top: 10px;
                    right: 10px;
                    left: 10px;
                    width: auto;
                    max-height: calc(100vh - 40px);
                }
                
                .debug-content {
                    padding: 10px;
                }
                
                .status-grid {
                    grid-template-columns: 1fr;
                }
                
                .debug-actions {
                    justify-content: center;
                }
                
                .voice-control-toggle.enhanced,
                .voice-debug-button {
                    padding: 10px;
                    font-size: 16px;
                }
            }
            
            /* Notification Enhancement */
            .notification.voice-info {
                border-left: 4px solid #007bff;
                background: linear-gradient(135deg, rgba(0, 123, 255, 0.1) 0%, rgba(0, 86, 179, 0.1) 100%);
            }
            
            .notification.voice-success {
                border-left: 4px solid #28a745;
                background: linear-gradient(135deg, rgba(40, 167, 69, 0.1) 0%, rgba(32, 134, 55, 0.1) 100%);
            }
            
            .notification.voice-warning {
                border-left: 4px solid #ffc107;
                background: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 152, 0, 0.1) 100%);
            }
            
            .notification.voice-error {
                border-left: 4px solid #dc3545;
                background: linear-gradient(135deg, rgba(220, 53, 69, 0.1) 0%, rgba(181, 44, 57, 0.1) 100%);
            }
        `;
        
        document.head.appendChild(style);
    }

    // Vylepšené event listenery
    attachEventListeners() {
        this.toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.isMobile && !this.isEnabled) {
                this.showNotification("🎤 Klikněte znovu pro aktivaci mikrofonu", 'info');
            }
            this.toggle();
        });

        this.helpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showDebugPanel();
        });

        // Debug panel controls
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-debug')) {
                this.hideDebugPanel();
            }
            
            if (e.target.id === 'clear-debug') {
                this.clearDebugLog();
            }
            
            if (e.target.id === 'export-debug') {
                this.exportDebugData();
            }
            
            if (e.target.id === 'test-voice') {
                this.testVoiceRecognition();
            }
            
            if (e.target.id === 'test-speech') {
                this.testSpeech();
            }
            
            if (e.target.id === 'reset-voice') {
                this.resetVoiceSystem();
            }
        });

        // Klávesové zkratky
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.ctrlKey && e.key === 'v') {
                e.preventDefault();
                this.toggle();
            }

            if (e.key === 'd' && e.ctrlKey) {
                e.preventDefault();
                this.showDebugPanel();
            }

            if (e.key === 'Escape') {
                if (!this.debugPanel.classList.contains('hidden')) {
                    this.hideDebugPanel();
                }
                if (!this.settingsPanel.classList.contains('hidden')) {
                    this.hideSettings();
                }
            }
        });

        if (DEBUG_VOICE) console.log("🎤 Enhanced event listeners attached");
    }

    // Debug panel funkce
    showDebugPanel() {
        this.debugPanel.classList.remove('hidden');
        this.updateDebugStats();
    }

    hideDebugPanel() {
        this.debugPanel.classList.add('hidden');
    }

    clearDebugLog() {
        const debugLog = document.getElementById('debug-log');
        if (debugLog) debugLog.innerHTML = '';
        
        const debugFailures = document.getElementById('debug-failures');
        if (debugFailures) debugFailures.innerHTML = '';
        
        this.recentFailures = [];
        this.showNotification('🗑️ Debug log vyčištěn', 'info');
    }

    exportDebugData() {
        const data = {
            settings: {
                isEnabled: this.isEnabled,
                confidence: this.confidence,
                language: this.currentLanguage,
                voiceResponses: this.voiceResponses
            },
            statistics: {
                recognitionAttempts: this.recognitionAttempts,
                commandHistoryCount: this.commandHistory.length,
                recentFailuresCount: this.recentFailures.length
            },
            commandHistory: this.commandHistory.slice(0, 20),
            recentFailures: this.recentFailures.slice(0, 10),
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            version: '2.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `voice-debug-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('📁 Debug data exportována', 'success');
    }

    testVoiceRecognition() {
        this.addToDebugLog('info', 'Spouštím test rozpoznávání...', 0);
        this.speak("Test rozpoznávání začíná. Řekněte 'test úspěšný'.");
        
        const testRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        testRecognition.continuous = false;
        testRecognition.interimResults = false;
        testRecognition.lang = this.currentLanguage;
        testRecognition.maxAlternatives = 3;
        
        testRecognition.onresult = (event) => {
            const results = Array.from(event.results[0]).map(r => ({
                transcript: r.transcript,
                confidence: r.confidence
            }));
            
            this.addToDebugLog('match', `Test výsledek: "${results[0].transcript}"`, results[0].confidence);
            
            if (results.length > 1) {
                results.slice(1).forEach((result, i) => {
                    this.addToDebugLog('info', `Alternativa ${i+2}: "${result.transcript}"`, result.confidence);
                });
            }
            
            this.speak(`Test dokončen. Rozpoznáno: ${results[0].transcript}`);
        };
        
        testRecognition.onerror = (event) => {
            this.addToDebugLog('fail', `Test selhal: ${event.error}`, 0);
            this.speak(`Test selhal: ${event.error}`);
        };
        
        testRecognition.start();
    }

    testSpeech() {
        const testPhrases = [
            "Test hlasového výstupu funguje správně",
            "Všechny systémy online, připraven k plnění rozkazů",
            "Hlasové ovládání verze dva aktivováno"
        ];
        
        const phrase = testPhrases[Math.floor(Math.random() * testPhrases.length)];
        this.addToDebugLog('info', `Test hlasu: "${phrase}"`, 0);
        this.speak(phrase);
    }

    resetVoiceSystem() {
        this.addToDebugLog('info', 'Resetuji hlasový systém...', 0);
        
        // Zastavíme současné rozpoznávání
        this.stopListening();
        
        // Vyčistíme timery
        if (this.restartTimer) {
            clearTimeout(this.restartTimer);
            this.restartTimer = null;
        }
        
        // Reset hodnot
        this.recognitionAttempts = 0;
        this.isRestarting = false;
        this.lastRestartTime = 0;
        
        // Znovu nastavíme rozpoznávání
        this.setupRobustRecognition();
        
        // Pokud bylo zapnuté, znovu zapneme
        if (this.isEnabled) {
            setTimeout(() => {
                this.startListening();
                this.addToDebugLog('info', 'Systém resetován a restartován', 0);
            }, 1000);
        } else {
            this.addToDebugLog('info', 'Systém resetován (zůstává vypnutý)', 0);
        }
        
        this.speak("Hlasový systém byl resetován");
        this.showNotification('🔄 Hlasový systém resetován', 'success');
    }

    // Vylepšené ovládání příkazů
    executeCommand(command, transcript, confidence) {
        if (DEBUG_VOICE) console.log("🎤 Executing enhanced command:", command.action, transcript);
        
        this.commandInProgress = true;
        const audioPlayer = document.getElementById('audioPlayer');
        
        switch (command.action) {
            case 'play':
                this.lastCommandWasPause = false;
                document.getElementById('play-button')?.click();
                this.speak("Spouštím přehrávání");
                break;
                
            case 'pause':
                this.lastCommandWasPause = true;
                this.wasPlayingBeforeRecognition = false;
                document.getElementById('pause-button')?.click();
                this.speak("Pozastavuji");
                break;
                
            case 'next':
                this.lastCommandWasPause = false;
                document.getElementById('next-button')?.click();
                this.speak("Další skladba");
                break;
                
            case 'previous':
                this.lastCommandWasPause = false;
                document.getElementById('prev-button')?.click();
                this.speak("Předchozí skladba");
                break;
                
            case 'restart':
                this.lastCommandWasPause = false;
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
                
            case 'acknowledge':
                const responses = [
                    "Systém online, admiral Jiříku",
                    "Hlasové ovládání verze dva připraveno",
                    "Všechny systémy funkční, čekám na rozkazy",
                    "Audio systém aktivní a připraven"
                ];
                this.speak(responses[Math.floor(Math.random() * responses.length)]);
                break;
                
            case 'getCurrentTrack':
                const currentTrack = document.getElementById('trackTitle')?.textContent;
                if (currentTrack) {
                    this.speak(`Aktuálně hraje: ${currentTrack}`);
                } else {
                    this.speak("Žádná skladba není spuštěna");
                }
                break;
                
            case 'showHelp':
                this.showCommandsHelp();
                break;
                
            case 'disableVoice':
                this.lastCommandWasPause = false;
                this.speak("Deaktivuji hlasové ovládání");
                setTimeout(() => this.disable(), 2000);
                break;
                
            default:
                this.speak("Příkaz rozpoznán, ale není implementován");
        }
        
        setTimeout(() => {
            this.commandInProgress = false;
        }, 500);
        
        this.showCommandFeedback(command.action, transcript);
    }

    // Zbytek funkcí zůstává stejný jako v původním kódu...
    adjustVolume(delta) {
        const audioPlayer = document.getElementById('audioPlayer');
        const volumeSlider = document.getElementById('volume-slider');
        
        if (!audioPlayer || !volumeSlider) return;
        
        const currentVolume = parseFloat(volumeSlider.value);
        const newVolume = Math.max(0, Math.min(1, currentVolume + delta));
        
        volumeSlider.value = newVolume;
        volumeSlider.dispatchEvent(new Event('input'));
    }

    showCommandFeedback(action, transcript) {
        if (this.statusIndicator) {
            this.statusIndicator.classList.add('command-executed');
            setTimeout(() => {
                this.statusIndicator?.classList.remove('command-executed');
            }, 1000);
        }
        
        this.showNotification(`🎤 "${transcript}" → ${action}`, 'voice-success', 2000);
    }

    showNotification(message, type = 'info', duration = 3000) {
        // Přidáme voice- prefix pro lepší styling
        const voiceType = type.startsWith('voice-') ? type : `voice-${type}`;
        
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, voiceType, duration);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    showCommandsHelp() {
        this.speak("Dostupné příkazy: přehrát, pauza, další, předchozí, hlasitost nahoru, hlasitost dolů, co hraje, help, vypni hlas");
        this.showDebugPanel();
    }

    speak(text) {
        if (!this.voiceResponses || !('speechSynthesis' in window)) return;
        
        this.speechQueue.push(text);
        this.processSpeechQueue();
    }

    processSpeechQueue() {
        if (this.isSpeaking || this.speechQueue.length === 0) return;
        
        this.isSpeaking = true;
        const text = this.speechQueue.shift();
        
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = this.responseVoice;
        utterance.volume = 0.8;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        
        utterance.onend = () => {
            this.isSpeaking = false;
            this.processSpeechQueue();
        };
        
        if (DEBUG_VOICE) console.log("🎤 Speaking:", text);
        speechSynthesis.speak(utterance);
    }

    loadVoices() {
        const voices = speechSynthesis.getVoices();
        const preferredVoices = ['cs-CZ', 'sk-SK', 'en-US', 'en-GB'];
        
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

    updateStatusIndicator(status = 'inactive') {
        if (!this.statusIndicator) return;
        
        this.statusIndicator.className = 'voice-status-indicator enhanced';
        if (status !== 'inactive') {
            this.statusIndicator.classList.add(status);
        }
    }

    async toggle() {
        if (this.isEnabled) {
            this.disable();
        } else {
            await this.enable();
        }
    }

    async enable() {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            
            this.isEnabled = true;
            this.toggleBtn.classList.add('active');
            this.toggleBtn.title = 'Hlasové ovládání v2.0 AKTIVNÍ (Ctrl+V)';
            
            this.startListening();
            await this.saveSettings();
            
            this.showNotification("🎤 Vylepšené hlasové ovládání aktivováno", 'voice-success');
            this.speak("Hlasové ovládání verze dva aktivováno. Systém připraven přijímat příkazy, admiral Jiříku.");
            
            if (DEBUG_VOICE) console.log("🎤 Enhanced voice control enabled");
        } catch (error) {
            console.error("🎤 Failed to enable voice control:", error);
            this.showNotification("❌ Nelze aktivovat mikrofon: " + error.message, 'voice-error');
            this.updateStatusIndicator('error');
        }
    }

    disable() {
        this.isEnabled = false;
        this.stopListening();
        
        if (this.restartTimer) {
            clearTimeout(this.restartTimer);
            this.restartTimer = null;
        }
        
        this.toggleBtn.classList.remove('active');
        this.toggleBtn.title = 'Hlasové ovládání v2.0 (Ctrl+V)';
        this.updateStatusIndicator('inactive');
        
        this.saveSettings();
        this.showNotification("🎤 Hlasové ovládání deaktivováno", 'voice-info');
        
        if (DEBUG_VOICE) console.log("🎤 Enhanced voice control disabled");
    }

    startListening() {
        if (!this.recognition || this.isListening) return;
        
        try {
            this.recognition.start();
        } catch (error) {
            console.error("🎤 Failed to start listening:", error);
            this.updateStatusIndicator('error');
            this.addToDebugLog('fail', `Start failed: ${error.message}`, 0);
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

    createSettingsPanel() {
        this.settingsPanel = document.createElement('div');
        this.settingsPanel.id = 'voice-settings-panel';
        this.settingsPanel.className = 'voice-settings-panel hidden';
        
        this.settingsPanel.innerHTML = `
            <div class="voice-settings-header">
                <h3>🎤 Hlasové ovládání v2.0</h3>
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
                    <input type="range" id="voice-confidence" min="0.2" max="0.8" step="0.1" value="${this.confidence}">
                    <span class="confidence-value">${Math.round(this.confidence * 100)}%</span>
                    <small>Nižší hodnota = citlivější rozpoznávání</small>
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
                    <h4>📋 Nejčastější příkazy:</h4>
                    <div class="commands-quick-list">
                        <div class="command-item">
                            <strong>"přehrát"</strong> - Spustí přehrávání
                        </div>
                        <div class="command-item">
                            <strong>"pauza"</strong> - Pozastaví přehrávání
                        </div>
                        <div class="command-item">
                            <strong>"další"</strong> - Další skladba
                        </div>
                        <div class="command-item">
                            <strong>"hlasitost nahoru"</strong> - Zvýší hlasitost
                        </div>
                        <div class="command-item">
                            <strong>"co hraje"</strong> - Oznámí aktuální skladbu
                        </div>
                        <div class="command-item">
                            <strong>"help"</strong> - Zobrazí nápovědu
                        </div>
                    </div>
                </div>
                
                <div class="setting-group">
                    <h4>📊 Statistiky:</h4>
                    <div class="stats-grid">
                        <div>Úspěšné příkazy: <span id="stats-success">0</span></div>
                        <div>Neúspěšné pokusy: <span id="stats-failures">0</span></div>
                        <div>Úspěšnost: <span id="stats-rate">-</span></div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.settingsPanel);
    }

    showSettings() {
        this.settingsPanel.classList.remove('hidden');
        this.updateStats();
    }

    hideSettings() {
        this.settingsPanel.classList.add('hidden');
    }

    updateStats() {
        const successCount = this.commandHistory.length;
        const failureCount = this.recentFailures.length;
        const total = successCount + failureCount;
        const rate = total > 0 ? Math.round((successCount / total) * 100) : 0;
        
        document.getElementById('stats-success').textContent = successCount;
        document.getElementById('stats-failures').textContent = failureCount;
        document.getElementById('stats-rate').textContent = total > 0 ? `${rate}%` : '-';
    }

    async saveSettings() {
        const settings = {
            isEnabled: this.isEnabled,
            voiceResponses: this.voiceResponses,
            confidence: this.confidence,
            language: this.language,
            audioPreventionActive: this.audioPreventionActive,
            timestamp: Date.now(),
            version: '2.0'
        };

        localStorage.setItem('voiceControlSettings', JSON.stringify(settings));

        try {
            if (typeof window.saveVoiceSettingsToFirestore === 'function') {
                await window.saveVoiceSettingsToFirestore(settings);
            }
        } catch (error) {
            console.warn("VoiceController: Firestore save failed:", error);
        }

        if (DEBUG_VOICE) console.log("🎤 Enhanced settings saved:", settings);
    }

    async loadSettings() {
        try {
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
        this.confidence = settings.confidence ?? 0.5;
        this.language = settings.language ?? 'cs-CZ';
        this.audioPreventionActive = settings.audioPreventionActive ?? true;
        this.currentLanguage = this.language;
    }

    // Export konfigurace pro sdílení
    exportConfiguration() {
        const config = {
            settings: {
                confidence: this.confidence,
                language: this.language,
                voiceResponses: this.voiceResponses,
                audioPreventionActive: this.audioPreventionActive
            },
            commands: this.commands.map(cmd => ({
                pattern: cmd.pattern,
                action: cmd.action,
                description: cmd.description
            })),
            performance: {
                totalCommands: this.commandHistory.length,
                totalFailures: this.recentFailures.length,
                successRate: this.commandHistory.length / (this.commandHistory.length + this.recentFailures.length)
            },
            timestamp: new Date().toISOString(),
            version: '2.0'
        };
        
        const blob = new Blob([JSON.stringify(config, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `voice-config-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('📁 Konfigurace exportována', 'voice-success');
    }

    // Metoda pro přidání custom příkazů tady je začátek? 
    addCustomCommand(patterns, action, description, callback) {
    if (!Array.isArray(patterns) || typeof callback !== 'function') {
        console.error("Enhanced VoiceController: Invalid custom command parameters");
        return false;
    }

    patterns.forEach(pattern => {
        this.commands.push({
            regex: new RegExp(`\\b${this.escapeRegExp(pattern)}\\b`, 'i'),
            fuzzyRegex: new RegExp(this.escapeRegExp(pattern).replace(/./g, '$&.*?'), 'i'), // Opravený řádek
            action,
            description,
            pattern,
            callback,
            custom: true
        });
        
        this.commandAliases.set(pattern.toLowerCase(), action);
    });

    if (DEBUG_VOICE) console.log(`🎤 Added custom command: ${action} with patterns:`, patterns);
    return true;
}

    // Vylepšená diagnostika
    runDiagnostics() {
        const diagnostics = {
            browser: {
                userAgent: navigator.userAgent,
                speechRecognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
                speechSynthesis: !!window.speechSynthesis,
                mediaDevices: !!navigator.mediaDevices
            },
            voice: {
                isEnabled: this.isEnabled,
                isListening: this.isListening,
                currentLanguage: this.currentLanguage,
                confidence: this.confidence,
                voiceCount: speechSynthesis.getVoices().length
            },
            performance: {
                commandCount: this.commandHistory.length,
                failureCount: this.recentFailures.length,
                successRate: this.commandHistory.length / (this.commandHistory.length + this.recentFailures.length) || 0,
                recognitionAttempts: this.recognitionAttempts
            },
            commands: {
                totalCommands: this.commands.length,
                customCommands: this.commands.filter(c => c.custom).length
            }
        };
        
        console.table(diagnostics.browser);
        console.table(diagnostics.voice);
        console.table(diagnostics.performance);
        console.table(diagnostics.commands);
        
        this.addToDebugLog('info', 'Diagnostika dokončena - viz console', 0);
        return diagnostics;
    }
}

// Globální inicializace enhanced verze
let enhancedVoiceController;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        enhancedVoiceController = new EnhancedVoiceController();
        window.voiceController = enhancedVoiceController;
        window.enhancedVoiceController = enhancedVoiceController;
    });
} else {
    enhancedVoiceController = new EnhancedVoiceController();
    window.voiceController = enhancedVoiceController;
    window.enhancedVoiceController = enhancedVoiceController;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedVoiceController;
}
