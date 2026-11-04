// Audio utility for speech recognition, recording, TTS playback, and visualizer

// Simple sound effects synthesized via Web Audio API
export const playSoundEffect = (type: 'ding' | 'start' | 'success' | 'click') => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'start') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'ding') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(784, ctx.currentTime); // G5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'success') {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + index * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + index * 0.08);
        osc.stop(ctx.currentTime + index * 0.08 + 0.25);
      });
    } else if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    }
  } catch (err) {
    // AudioContext might be restricted until user gesture
  }
};

// Play audio from base64 string
export class AudioPlayer {
  private currentAudio: HTMLAudioElement | null = null;

  public playBase64(base64: string, mimeType = 'audio/wav', onEnded?: () => void): Promise<void> {
    return new Promise((resolve, reject) => {
      this.stop();
      try {
        const audio = new Audio(`data:${mimeType};base64,${base64}`);
        this.currentAudio = audio;

        audio.onended = () => {
          this.currentAudio = null;
          if (onEnded) onEnded();
          resolve();
        };

        audio.onerror = (e) => {
          this.currentAudio = null;
          reject(e);
        };

        audio.play().catch(reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  public stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    // Also cancel any browser speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public isPlaying(): boolean {
    return this.currentAudio !== null && !this.currentAudio.paused;
  }
}

export const globalAudioPlayer = new AudioPlayer();

// Fallback Browser Speech Synthesis
export const speakWithBrowser = (text: string, lang = 'en-US', rate = 0.9): Promise<void> => {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;

    // Try to find a good natural voice
    const voices = window.speechSynthesis.getVoices();
    if (lang.startsWith('en')) {
      const preferred = voices.find(
        (v) => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')) && v.lang.startsWith('en')
      );
      if (preferred) utterance.voice = preferred;
    } else if (lang.startsWith('ar')) {
      const arVoice = voices.find((v) => v.lang.startsWith('ar'));
      if (arVoice) utterance.voice = arVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
};

// Web Speech Recognition wrapper
export interface SpeechRecognitionResultState {
  transcript: string;
  isFinal: boolean;
}

export class LiveSpeechRecognizer {
  private recognition: any = null;
  private isListening = false;
  public onResultCallback?: (result: SpeechRecognitionResultState) => void;
  public onErrorCallback?: (err: any) => void;
  public onEndCallback?: () => void;

  constructor() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      // Default to Moroccan Arabic, but can also pick up mixed English phrases
      this.recognition.lang = 'ar-MA';

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (this.onResultCallback) {
          this.onResultCallback({
            transcript: finalTranscript || interimTranscript,
            isFinal: !!finalTranscript,
          });
        }
      };

      this.recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech' && this.onErrorCallback) {
          this.onErrorCallback(event.error);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.onEndCallback) this.onEndCallback();
      };
    }
  }

  public setLang(lang: 'ar-MA' | 'en-US' | 'ar-SA') {
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  public start(): boolean {
    if (!this.recognition) return false;
    try {
      this.recognition.start();
      this.isListening = true;
      playSoundEffect('start');
      return true;
    } catch (e) {
      return false;
    }
  }

  public stop(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.isListening = false;
    }
  }

  public isAvailable(): boolean {
    return !!this.recognition;
  }
}

// MediaRecorder wrapper for microphone capture to send to Gemini API
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  public async start(): Promise<boolean> {
    try {
      this.audioChunks = [];
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      playSoundEffect('start');
      return true;
    } catch (err) {
      console.error('Microphone access error:', err);
      return false;
    }
  }

  public stop(): Promise<{ blob: Blob; base64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not initialized'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.audioChunks, { type: mimeType });

        // Clean up tracks
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
          this.stream = null;
        }

        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1] || '';
          resolve({ blob, base64, mimeType });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  public getStream(): MediaStream | null {
    return this.stream;
  }
}
