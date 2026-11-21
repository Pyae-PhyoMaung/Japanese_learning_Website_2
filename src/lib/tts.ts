/* Japanese text-to-speech — port of app.js speak()/speakFallback(). The
   original first tried a server /api/tts endpoint and fell back to the
   device voice; this app deploys as static Next.js (no TTS backend), so it
   uses the browser's Japanese speech-synthesis voice directly (the same
   fallback path the original used on GitHub Pages/Vercel). */
let voices: SpeechSynthesisVoice[] = [];

function loadVoices() {
  try { voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; } catch (e) { voices = []; }
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices();
  if ((speechSynthesis as any).onvoiceschanged !== undefined) {
    (speechSynthesis as any).onvoiceschanged = loadVoices;
  }
}

function jaVoice(): SpeechSynthesisVoice | null {
  for (let i = 0; i < voices.length; i++) {
    if (/^ja([-_](JP|Jpan))?$/i.test(voices[i].lang)) return voices[i];
  }
  for (let j = 0; j < voices.length; j++) {
    if (/ja/i.test(voices[j].lang)) return voices[j];
  }
  return null;
}

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function hasJaVoice(): boolean {
  if (!voices.length) loadVoices();
  return /ja/i.test(voices.map((v) => v.lang).join(','));
}

export function speak(text: any, rate?: number): boolean {
  const txt = String(text || '').trim();
  if (!txt) return false;
  if (!ttsSupported()) return false;
  if (!voices.length) loadVoices();
  const v = jaVoice();
  try { speechSynthesis.cancel(); } catch (e) {}
  try { speechSynthesis.resume(); } catch (e) {}
  const u = new SpeechSynthesisUtterance(txt);
  u.lang = 'ja-JP';
  u.rate = rate || 1;
  if (v) u.voice = v;
  speechSynthesis.speak(u);
  setTimeout(() => { try { speechSynthesis.resume(); } catch (e) {} }, 300);
  return true;
}
