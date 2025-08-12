const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
//const DEBUG_MODE = false; // Synchronizováno s hlavním skriptem

// Inicializace rozpoznávání hlasu
function initializeVoiceControl() {
    if (!SpeechRecognition) {
        if (DEBUG_MODE) console.error("VoiceControl: SpeechRecognition není podporováno v tomto prohlížeči.");
        window.showNotification("Hlasové ovládání není v tomto prohlížeči podporováno.", "error");
        return null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'cs-CZ'; // Nastavení jazyka na češtinu
    recognition.interimResults = false; // Získávat pouze finální výsledky
    recognition.maxAlternatives = 1; // Jedna nejlepší varianta

    return recognition;
}

// Normalizace textu pro rozpoznávání
function normalizeText(text) {
    return text.toLowerCase().trim()
        .replace(/[.,!?]/g, '') // Odstranění interpunkce
        .replace(/\s+/g, ' ');  // Normalizace mezer
}

// Mapování hlasových příkazů na akce
const commandMap = [
    { phrases: ['přehraj', 'přehrát', 'play'], action: () => DOM.playButton?.click(), description: "Spustí přehrávání aktuální skladby." },
    { phrases: ['pauza', 'pauzuj', 'pause'], action: () => DOM.pauseButton?.click(), description: "Pozastaví přehrávání." },
    { phrases: ['stop', 'zastav'], action: () => DOM.pauseButton?.click(), description: "Zastaví přehrávání (stejné jako pauza)." },
    { phrases: ['další', 'příští', 'next'], action: () => DOM.nextButton?.click(), description: "Přehraje další skladbu." },
    { phrases: ['předchozí', 'předchozi', 'previous'], action: () => DOM.prevButton?.click(), description: "Přehraje předchozí skladbu." },
    { phrases: ['hlasitost nahoru', 'zvýšit hlasitost', 'volume up'], action: () => {
        if (DOM.volumeSlider) {
            DOM.volumeSlider.value = Math.min(1, parseFloat(DOM.volumeSlider.value) + 0.05);
            DOM.volumeSlider.dispatchEvent(new Event('input'));
        }
    }, description: "Zvýší hlasitost o 5 %." },
    { phrases: ['hlasitost dolů', 'sniž hlasitost', 'volume down'], action: () => {
        if (DOM.volumeSlider) {
            DOM.volumeSlider.value = Math.max(0, parseFloat(DOM.volumeSlider.value) - 0.05);
            DOM.volumeSlider.dispatchEvent(new Event('input'));
        }
    }, description: "Sníží hlasitost o 5 %." },
    { phrases: ['ztlumit', 'mute'], action: () => DOM.muteButton?.click(), description: "Ztlumí zvuk." },
    { phrases: ['zrušit ztlumení', 'unmute'], action: () => {
        if (DOM.audioPlayer?.muted) DOM.muteButton?.click();
    }, description: "Zruší ztlumení." },
    { phrases: ['opakování zapni', 'zapnout opakování', 'loop on'], action: () => {
        if (!DOM.audioPlayer?.loop) DOM.loopButton?.click();
    }, description: "Zapne opakování aktuální skladby." },
    { phrases: ['opakování vypni', 'vypnout opakování', 'loop off'], action: () => {
        if (DOM.audioPlayer?.loop) DOM.loopButton?.click();
    }, description: "Vypne opakování." },
    { phrases: ['náhodné zapni', 'zapnout náhodné', 'shuffle on'], action: () => {
        if (!isShuffled) DOM.shuffleButton?.click();
    }, description: "Zapne náhodné přehrávání." },
    { phrases: ['náhodné vypni', 'vypnout náhodné', 'shuffle off'], action: () => {
        if (isShuffled) DOM.shuffleButton?.click();
    }, description: "Vypne náhodné přehrávání." },
    { phrases: ['resetuj skladbu', 'reset track'], action: () => DOM.resetButton?.click(), description: "Resetuje aktuální skladbu na začátek." },
    { phrases: ['celá obrazovka', 'fullscreen'], action: () => {
        if (!document.fullscreenElement) DOM.fullscreenToggle?.click();
    }, description: "Přepne do režimu celé obrazovky." },
    { phrases: ['vypni celou obrazovku', 'exit fullscreen'], action: () => {
        if (document.fullscreenElement) DOM.fullscreenToggle?.click();
    }, description: "Ukončí režim celé obrazovky." },
    { phrases: ['zobraz playlist', 'show playlist'], action: () => {
        if (!playlistVisible) DOM.togglePlaylist?.click();
    }, description: "Zobrazí playlist." },
    { phrases: ['skryj playlist', 'hide playlist'], action: () => {
        if (playlistVisible) DOM.togglePlaylist?.click();
    }, description: "Skryje playlist." },
    { phrases: ['přidej oblíbené', 'add favorite'], action: async () => {
        const track = originalTracks[currentTrackIndex];
        if (track && !favorites.includes(track.title)) await window.toggleFavorite(track.title);
    }, description: "Přidá aktuální skladbu do oblíbených." },
    { phrases: ['odeber oblíbené', 'remove favorite'], action: async () => {
        const track = originalTracks[currentTrackIndex];
        if (track && favorites.includes(track.title)) await window.toggleFavorite(track.title);
    }, description: "Odebere aktuální skladbu z oblíbených." },
    { phrases: ['časovač pět minut', 'timer five minutes'], action: () => {
        setTimerValue(5);
        DOM.timer.start?.click();
    }, description: "Nastaví časovač na 5 minut a spustí ho." },
    { phrases: ['časovač patnáct minut', 'timer fifteen minutes'], action: () => {
        setTimerValue(15);
        DOM.timer.start?.click();
    }, description: "Nastaví časovač na 15 minut a spustí ho." },
    { phrases: ['časovač třicet minut', 'timer thirty minutes'], action: () => {
        setTimerValue(30);
        DOM.timer.start?.click();
    }, description: "Nastaví časovač na 30 minut a spustí ho." },
    { phrases: ['časovač hodina', 'timer one hour'], action: () => {
        setTimerValue(60);
        DOM.timer.start?.click();
    }, description: "Nastaví časovač na 60 minut a spustí ho." },
    { phrases: ['časovač stop', 'stop timer'], action: () => DOM.timer.stop?.click(), description: "Zastaví časovač." }
];

// Funkce pro spuštění hlasového ovládání
function startVoiceControl() {
    const recognition = initializeVoiceControl();
    if (!recognition) return;

    recognition.onresult = (event) => {
        const transcript = normalizeText(event.results[0][0].transcript);
        if (DEBUG_MODE) console.log("VoiceControl: Rozpoznán příkaz:", transcript);

        let commandExecuted = false;
        for (const command of commandMap) {
            if (command.phrases.some(phrase => transcript.includes(phrase))) {
                command.action();
                window.showNotification(`Provádím příkaz: ${command.phrases[0]}`, "info");
                commandExecuted = true;
                break;
            }
        }

        if (!commandExecuted) {
            if (DEBUG_MODE) console.warn("VoiceControl: Neznámý příkaz:", transcript);
            window.showNotification("Nerozpoznán příkaz, zkuste znovu.", "warn");
        }
    };

    recognition.onerror = (event) => {
        if (DEBUG_MODE) console.error("VoiceControl: Chyba rozpoznávání:", event.error);
        if (event.error === "no-speech") {
            window.showNotification("Žádný hlas nerozpoznán, zkuste mluvit zřetelněji.", "warn");
        } else if (event.error === "not-allowed") {
            window.showNotification("Přístup k mikrofonu byl odepřen.", "error");
        } else {
            window.showNotification("Chyba při rozpoznávání hlasu.", "error");
        }
    };

    recognition.onend = () => {
        if (DEBUG_MODE) console.log("VoiceControl: Rozpoznávání ukončeno.");
        // Automaticky restartovat rozpoznávání pro nepřetržité ovládání
        setTimeout(() => recognition.start(), 500);
    };

    // Spuštění rozpoznávání
    recognition.start();
    if (DEBUG_MODE) console.log("VoiceControl: Hlasové ovládání spuštěno.");
    window.showNotification("Hlasové ovládání aktivní. Mluvte!", "info");
}

// Přidání tlačítka pro aktivaci hlasového ovládání
function initializeVoiceControlButton() {
    const voiceButton = document.createElement('button');
    voiceButton.id = 'voice-control-button';
    voiceButton.className = 'control-button';
    voiceButton.title = 'Aktivovat hlasové ovládání (V)';
    voiceButton.textContent = '🎙️';
    voiceButton.onclick = () => {
        startVoiceControl();
        voiceButton.classList.add('active');
        voiceButton.disabled = true; // Zabránit opakovanému spuštění
    };

    const controlsDiv = document.querySelector('#control-panel .controls');
    if (controlsDiv) {
        controlsDiv.appendChild(voiceButton);
    } else if (DEBUG_MODE) {
        console.error("VoiceControl: Element .controls nenalezen pro tlačítko hlasového ovládání.");
    }

    // Přidání klávesové zkratky (V)
    document.addEventListener('keydown', (e) => {
        if (e.code === 'KeyV' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            if (DEBUG_MODE) console.log("VoiceControl: Klávesová zkratka pro hlasové ovládání.");
            startVoiceControl();
            voiceButton.classList.add('active');
            voiceButton.disabled = true;
        }
    });
}

// Inicializace při načtení stránky
document.addEventListener('DOMContentLoaded', () => {
    initializeVoiceControlButton();
});
