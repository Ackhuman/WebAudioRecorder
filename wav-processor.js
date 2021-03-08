class WavProcessor extends AudioWorkletProcessor {
    NUM_SAMPLES = 128;
    constructor() {
        super();
        this.port.onmessage = this.onMessage.bind(this);        
        this._buffer = new ArrayBuffer(this.NUM_SAMPLES * 2);
        this._view = new DataView(this._buffer);
    }
    //parameters
    isRecording = false;
    isFinished = false;
    isMono = true;
    isOnlinePcm = false;
    _buffer = null;
    _view = null;

    _recordingStopped() {
        this.port.postMessage({
            eventType: 'stop'
        });
    }

    process (inputs, outputs, parameters) {
        if (!this.isRecording) {
            return !this.isFinished;
        }
        this.port.postMessage({
            eventType: 'dataavailable',
            audioBuffer: this.writeBuffer(inputs)
        });
        return true;
    }

    writeBuffer(inputs){
        let inputStream = inputs[0];
        inputStream.forEach(channel => {
            channel.forEach((sample, sampleIndex) => {
                let clampedSample = this.clamp(sample, -1, 1);
                let pcmSample = this.get16BitPcm(clampedSample);
                this._view.setInt16(sampleIndex * 2, pcmSample, true);
            });
        });
        return this._view.buffer.slice();
    }

    mixDownToMono(lSample, rSample) {
        return (lSample + rSample) / 2;
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    get16BitPcm(sample) {
        return sample < 0 
            ? sample * 0x8000
            : sample * 0x7FFF;
    }
    
    onMessage(evt) {
        let messageType = evt.data.eventType;
        switch(messageType) {
            case 'start':
                this.isRecording = true;
                break;
            case 'stop':
                this.isRecording = false;
                break;
            case 'finish':
                this.port.postMessage({
                    eventType: 'finish'
                });
                this.isFinished = true;
                break;
            case 'setStereo':
                this.isMono = false;
                break;
            case 'processOnline':
                this.isOnlinePcm = true;
                break;
        }
    }
}
registerProcessor('wav-processor', WavProcessor);