const statsWindowSize = 1024 * 8; // ~5 stats per second for 44kHz
const clipThreshold = 0.98;

/* eslint-disable */
class RecordingWorkletProcessor extends AudioWorkletProcessor {
  _sampleRate = 44100;
  _numSamplesPerChannel = 128;
  _msPerS = 1000;
  _float32Buffer = undefined;

  constructor() {
    super();
    this.isRecording = false;
    this.clipping = false;
    this.sampleIndex = 0;
    this.sum = 0;
    this.recordedBuffers = [];
    this.writeIndex = 0;

    this.port.onmessage = ({ data }) => {
      if (data.type === 'startRecording') {
        this.writeIndex = 0;
        this.recordedBuffers = [];
        this.isRecording = true;
      } else if (data.type === 'stopRecording') {
        this.port.postMessage({
          type: 'recording',
          buffers: this.recordedBuffers,
        });
        this.isRecording = false;
      }
    };

    this._float32Buffer = new Float32Array(this._numSamplesPerChannel);
  }
  process(inputs, outputs, parameters) {
    const t0 = Date.now();
    const writeIndex = this.writeIndex;
    this.writeIndex += 1;

    // Select the first input's first channel
    const buffer0 = inputs[0][0];
    // const { windowSize, clipThreshold, isRecording } = parameters;
    if (this.isRecording) {
      // Clone the data into a new Float32Array
      const f32Buffer = new Float32Array(buffer0.length);
      f32Buffer.set(buffer0);
      this.recordedBuffers.splice(writeIndex, 0, f32Buffer);
    }

    // Detach the stats computation to prevent underruns
    this.computeStats(buffer0);

    // this.lastRunFinished = true;
    if (this.isRecording) {
      const t1 = Date.now();
      const elapsedTime = t1 - t0;
      if (elapsedTime > (this._numSamplesPerChannel / this._sampleRate) * this._msPerS) {
        const atPosition = (writeIndex * this._numSamplesPerChannel) / this._sampleRate;
        this.port.postMessage({ type: 'underrun', elapsedTime, atPosition });
      }
    }
    // Keep processor alive
    return true;
  }
}
/* eslint-enable */

registerProcessor('recording-worklet-processor', RecordingWorkletProcessor);