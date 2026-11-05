// Audio utility for speech recognition, recording, TTS playback, and visualizer
// Specifically engineered for mobile browsers (iOS Safari, Android Chrome) & desktop

let sharedAudioContext: AudioContext | null = null;
let sharedAudioElement: HTMLAudioElement | null = null;
let isAudioUnlocked = false;

// Global reference to prevent garbage collection in Chrome/Safari
let activeUtterance: SpeechSynthesisUtterance | null = null;

export const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioContext) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      sharedAudioContext = new AudioCtx();
    }
  }
  return sharedAudioContext;
};

// Crucial for mobile: unlock audio on ANY user gesture (tap/click)
export const unlockAudio = () => {
  if (typeof window === 'undefined') return;

  try {
    // 1. Unlock AudioContext
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // 2. Unlock reusable HTMLAudioElement with silent 1-sample WAV
    if (!sharedAudioElement) {
      sharedAudioElement = new Audio();
      sharedAudioElement.id = 'ostadi-master-audio';
      // Extremely tiny silent WAV base64
      sharedAudioElement.src =
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      sharedAudioElement.play().then(() => {
        if (sharedAudioElement) sharedAudioElement.pause();
      }).catch(() => {});
    }

    // 3. Unlock SpeechSynthesis on mobile
    if ('speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }

    isAudioUnlocked = true;
  } catch (err) {
    console.warn('Audio unlock warning:', err);
  }
};

// Simple sound effects synthesized via Web Audio API
export const playSoundEffect = (type: 'ding' | 'start' | 'success' | 'click') => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

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
      osc.frequency.setValueAtTime(784, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'success') {
      const notes = [523.25, 659.25, 783.99, 1046.5];
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

// Convert Base64 string to Blob URL (essential for Mobile Safari & Chrome stability)
export const base64ToBlobUrl = (base64: string, mimeType = 'audio/wav'): string => {
  const byteCharacters = atob(base64);
  const byteArrays = [];
  const sliceSize = 512;

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  const blob = new Blob(byteArrays, { type: mimeType });
  return URL.createObjectURL(blob);
};

// Robust Audio Player with Web Audio API + HTML5 Audio fallback
export class AudioPlayer {
  private currentAudioUrl: string | null = null;
  private currentSourceNode: AudioBufferSourceNode | null = null;
  private isCurrentlyPlaying = false;

  public async playBase64(
    base64: string,
    mimeType = 'audio/wav',
    onEnded?: () => void
  ): Promise<boolean> {
    this.stop();
    unlockAudio();

    // Strategy 1: Try HTMLAudioElement with Blob URL (best for mobile streaming)
    try {
      const blobUrl = base64ToBlobUrl(base64, mimeType);
      this.currentAudioUrl = blobUrl;

      const audio = sharedAudioElement || new Audio();
      sharedAudioElement = audio;
      audio.src = blobUrl;
      audio.playbackRate = 1.0;

      return new Promise<boolean>((resolve) => {
        let isDone = false;
        const cleanup = (success: boolean) => {
          if (isDone) return;
          isDone = true;
          this.isCurrentlyPlaying = false;
          if (blobUrl) {
            try {
              URL.revokeObjectURL(blobUrl);
            } catch {}
          }
          if (onEnded) onEnded();
          resolve(success);
        };

        audio.onended = () => cleanup(true);
        audio.onerror = () => {
          // If HTMLAudio fails, try Strategy 2: Web Audio API buffer
          this.playViaWebAudio(base64, onEnded).then(resolve);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              this.isCurrentlyPlaying = true;
            })
            .catch((err) => {
              console.warn('HTMLAudio play failed, falling back to WebAudio:', err);
              // Fallback to Web Audio
              this.playViaWebAudio(base64, onEnded).then(resolve);
            });
        }
      });
    } catch (err) {
      console.warn('Audio play exception, fallback to WebAudio:', err);
      return this.playViaWebAudio(base64, onEnded);
    }
  }

  // Strategy 2: Web Audio API direct decoding
  public async playViaWebAudio(base64: string, onEnded?: () => void): Promise<boolean> {
    try {
      const ctx = getAudioContext();
      if (!ctx) return false;
      if (ctx.state === 'suspended') await ctx.resume();

      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      this.currentSourceNode = source;
      this.isCurrentlyPlaying = true;

      return new Promise<boolean>((resolve) => {
        source.onended = () => {
          this.isCurrentlyPlaying = false;
          this.currentSourceNode = null;
          if (onEnded) onEnded();
          resolve(true);
        };
        source.start(0);
      });
    } catch (e) {
      console.error('WebAudio decode failed:', e);
      if (onEnded) onEnded();
      return false;
    }
  }

  public stop(): void {
    this.isCurrentlyPlaying = false;
    if (sharedAudioElement) {
      try {
        sharedAudioElement.pause();
        sharedAudioElement.currentTime = 0;
      } catch {}
    }
    if (this.currentSourceNode) {
      try {
        this.currentSourceNode.stop();
        this.currentSourceNode.disconnect();
      } catch {}
      this.currentSourceNode = null;
    }
    if (this.currentAudioUrl) {
      try {
        URL.revokeObjectURL(this.currentAudioUrl);
      } catch {}
      this.currentAudioUrl = null;
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }

  public isPlaying(): boolean {
    return this.isCurrentlyPlaying;
  }
}

export const globalAudioPlayer = new AudioPlayer();

// Fallback Browser Speech Synthesis (engineered to never freeze or hang)
export const speakWithBrowser = (text: string, lang = 'en-US', rate = 0.9): Promise<void> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      activeUtterance = utterance; // Prevent garbage collection
      utterance.lang = lang;
      utterance.rate = rate;

      const voices = window.speechSynthesis.getVoices();
      if (lang.startsWith('en')) {
        const preferred = voices.find(
          (v) =>
            (v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Samantha') ||
              v.name.includes('Daniel') ||
              v.name.includes('Karen')) &&
            v.lang.startsWith('en')
        );
        if (preferred) utterance.voice = preferred;
      } else if (lang.startsWith('ar')) {
        const arVoice = voices.find((v) => v.lang.startsWith('ar'));
        if (arVoice) utterance.voice = arVoice;
      }

      let isFinished = false;
      const finish = () => {
        if (isFinished) return;
        isFinished = true;
        activeUtterance = null;
        resolve();
      };

      utterance.onend = finish;
      utterance.onerror = finish;

      // Timeout safety: if speech gets stalled, auto-resolve so the app doesn't hang!
      const wordsCount = text.split(' ').length;
      const estimatedMs = Math.max(1500, (wordsCount / 2.5) * 1000 + 1000);
      setTimeout(finish, estimatedMs);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('speakWithBrowser error:', e);
      resolve();
    }
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
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
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

        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
          this.stream = null;
        }

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
