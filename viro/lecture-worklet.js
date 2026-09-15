// Capture runs on the audio thread. Every 10 seconds becomes independently playable PCM.
class LectureCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.samples = new Int16Array(sampleRate * 10);
    this.used = 0;
    this.port.onmessage = ({ data }) => {
      if (data === 'flush') { this.flush(); this.port.postMessage({ flushed: true }); }
    };
  }
  flush() {
    if (!this.used) return;
    const pcm = this.samples.slice(0, this.used);
    this.port.postMessage({ pcm, rate: sampleRate }, [pcm.buffer]);
    this.used = 0;
  }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (input) for (const value of input) {
      this.samples[this.used++] = Math.round(Math.max(-1, Math.min(1, value)) * 32767);
      if (this.used === this.samples.length) this.flush();
    }
    return true;
  }
}
registerProcessor('lecture-capture', LectureCapture);
