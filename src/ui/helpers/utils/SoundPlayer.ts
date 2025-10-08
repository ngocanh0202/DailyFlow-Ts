import { SoundType } from "~/enums/Sound.Type.enum";

class SoundPlayer {
    private static instance: SoundPlayer;
    private audioMap: Map<string, HTMLAudioElement>;
    private currentAudio: HTMLAudioElement | null;
    private isPlaying: boolean;
    private volume: number;
    private loop: boolean;
    private soundEnabled: boolean;
    private startupSoundEnabled: boolean;
    private soundOnAppStart: SoundType = SoundType.SOUND_AHHH;
    
    private constructor() {
        this.audioMap = new Map<string, HTMLAudioElement>();
        this.currentAudio = null;
        this.isPlaying = false;
        this.volume = 1.0;
        this.loop = false;
        this.soundEnabled = true;
        this.startupSoundEnabled = true;
    }

    public static getInstance(): SoundPlayer {
        if (!SoundPlayer.instance) {
            SoundPlayer.instance = new SoundPlayer();
        }
        return SoundPlayer.instance;
    }

    public init(audioElements: { [key: string]: HTMLAudioElement }): void {
        Object.entries(audioElements).forEach(([key, audio]) => {
            this.audioMap.set(key, audio);
        });
    }

    public play(key: SoundType): void {
        if (!this.soundEnabled) {
            return;
        }

        if (key === this.soundOnAppStart && !this.startupSoundEnabled) {
            return;
        }
        
        const audio = this.audioMap.get(key);
        if (!audio) {
            console.warn(`Audio with key "${key}" not found`);
            return;
        }
        
        if (this.currentAudio) {
            try {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
            } catch (error) {
                console.warn('Failed to stop current audio:', error);
            }
        }
        
        this.isPlaying = false;
        this.currentAudio = audio;
        this.currentAudio.volume = this.volume;
        this.currentAudio.loop = this.loop;
        this.currentAudio.currentTime = 0;
        
        try {
            this.currentAudio.play()
                .then(() => {
                    this.isPlaying = true;
                })
                .catch((error) => {
                    console.warn(`Failed to play audio "${key}":`, error);
                    this.isPlaying = false;
                });
        } catch (error) {
            console.warn(`Failed to start audio "${key}":`, error);
            this.isPlaying = false;
        }
    }

    public pause(): void {
        if (this.currentAudio && this.isPlaying) {
            try {
                this.currentAudio.pause();
            } catch (error) {
                console.warn('Failed to pause audio:', error);
            }
        }
        this.isPlaying = false;
    }

    public stop(): void {
        if (this.currentAudio) {
            try {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
            } catch (error) {
                console.warn('Failed to stop audio:', error);
            }
        }
        this.isPlaying = false;
    }

    public setVolume(volume: number): void {
        this.volume = volume;
        if (this.currentAudio) {
            this.currentAudio.volume = volume;
        }
    }

    public getVolume(): number {
        return this.volume;
    }

    public setLoop(loop: boolean): void {
        this.loop = loop;
        if (this.currentAudio) {
            this.currentAudio.loop = loop;
        }
    }

    public isCurrentlyPlaying(): boolean {
        return this.isPlaying;
    }

    public getAudio(key: string): HTMLAudioElement | undefined {
        return this.audioMap.get(key);
    }

    public hasAudio(key: string): boolean {
        return this.audioMap.has(key);
    }

    public getAllAudioKeys(): string[] {
        return Array.from(this.audioMap.keys());
    }

    public setSoundEnabled(enabled: boolean): void {
        this.soundEnabled = enabled;
    }

    public setStartupSoundEnabled(enabled: boolean): void {
        this.startupSoundEnabled = enabled;
    }

    public isSoundEnabled(): boolean {
        return this.soundEnabled;
    }

    public isStartupSoundEnabled(): boolean {
        return this.startupSoundEnabled;
    }

    public loadSoundSettings(): void {
        try {
            const savedSettings = localStorage.getItem('settings');
            if (savedSettings) {
                const parsedSettings = JSON.parse(savedSettings);
                this.soundEnabled = parsedSettings.soundEnabled ?? true;
                this.startupSoundEnabled = parsedSettings.startupSoundEnabled ?? true;
            }
        } catch (error) {
            console.warn('Failed to load sound settings:', error);
        }
    }

    public saveSoundSettings(): void {
        try {
            const savedSettings = localStorage.getItem('settings');
            let settings = {};
            
            if (savedSettings) {
                settings = JSON.parse(savedSettings);
            }
            
            const updatedSettings = {
                ...settings,
                soundEnabled: this.soundEnabled,
                startupSoundEnabled: this.startupSoundEnabled
            };
            
            localStorage.setItem('settings', JSON.stringify(updatedSettings));
        } catch (error) {
            console.warn('Failed to save sound settings:', error);
        }
    }
}

export default SoundPlayer;