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
        var sampleIndex = 0;
        var offset = 0;
        while(sampleIndex < inputStream[0].length * 2) {
            let lSample = inputStream[0][sampleIndex];
            let rSample = inputStream[1][sampleIndex];
            let monoSample = this.mixDownToMono(lSample, rSample);
            let clampedSample = this.clamp(monoSample, -1, 1);
            let pcmSample = this.get16BitPcm(clampedSample);
            this._view.setInt16(offset, pcmSample, true);
            sampleIndex++;
            offset += 2;
        }
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
    
    write16BitPcm(inputs) {
        
        inputs.forEach(function(inputSample, index) {
            var outputSample = Math.max(-1, Math.min(1, inputSample));
            let pcmValue = outputSample < 0 
                ? outputSample * 0x8000
                : outputSample * 0x7FFF;
            this._view.setInt16(index, pcmValue, true);
        }.bind(this));
        return this._view.buffer;
    }

    writeMono(inputs) {
        //check if already mono
        if(inputs[0].length === 1){
            return inputs[0][0];
        }
        //mix down to one channel
        let inputStream = inputs[0];            
        let monoBuffer = [];
        var i = 0;
        while(i < inputStream[0].length) {
            let monoValue = (inputStream[0][i] + inputStream[1][i]) / 2;
            monoBuffer.push(monoValue);
            i++;
        }
        return monoBuffer;
    }

    writeInterleaved(inputs) {
        let interleavedBuffer = [];
        //interleave the channel data and push it to the buffer
        let inputStream = inputs[0];            
        inputStream[0].forEach((_, index) => {
            inputStream.forEach(channel => {
                interleavedBuffer.push(channel[index]);
            })
        });
        return interleavedBuffer;
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