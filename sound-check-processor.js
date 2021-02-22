class SoundCheckProcessor extends AudioWorkletProcessor {
    NUM_SAMPLES = 128;
    SAMPLES_PER_SECOND = 44100;
    constructor() {
        super();
        this.port.onmessage = this.onMessage.bind(this);        
        this._roomToneProfile = new ArrayBuffer(this.NUM_SAMPLES * 4);
        this._roomToneProfileView = new DataView(this._roomToneProfile);
        this._roomToneSum = new ArrayBuffer(this.NUM_SAMPLES * 4);
        this._roomToneSumView = new DataView(this._roomToneProfile);
    }

    _roomToneSum = null;
    _roomToneSumView = null;

    _roomToneProfile = null;
    _roomToneProfileView = null;
    _numRoomToneFrames = 1;

    peakAmplitude = 0.0;
    normalAmplitude = 0.0;
    noiseFloor = 0.0;
    threshold = 0.0;

    processingFn = () => true;
    
    process (inputs, outputs, parameters) {
        return this.processingFn(inputs);
    }

    onRoomToneProcessingBegin(){
        this._kahanErrorBuf = new ArrayBuffer(this.NUM_SAMPLES * 4);
        this._kahanErrorBufView = new DataView(this._roomToneProfile);
    }
    
    processRoomTone(inputs) {
        let inputStream = inputs[0];
        var sampleIndex = 0;
        while(sampleIndex < inputStream[0].length) {
            let currentValue = this._roomToneProfileView.getFloat32(sampleIndex * 4);
            //calculates an average for the stream.
            //this may have floating-point swamping issues.
            //it may also be better to find which frequencies are represented the most at certain volume levels
            //  i.e., those that are at the noise floor, those that are above the noise floor (for very noisy audio)
            //let newValue = ((currentValue * this._numRoomToneFrames) + inputStream[sampleIndex]) / (this._numRoomToneFrames + 1)
            //this._roomToneProfileView.setFloat32(sampleIndex * 4, newValue, true);
            this.kahanSumOnline(currentValue, sampleIndex);
            sampleIndex++;
        }
        this._numRoomToneFrames++;
        return true;
    }
    onRoomToneProcessingComplete() {
        for(var byteOffset = 0; byteOffset < this.NUM_SAMPLES * 4; byteOffset += 4) {
            let sum = this._roomToneProfileView.getFloat32(byteOffset, true);
            this._roomToneProfileView.setFloat32(byteOffset, sum / this._numRoomToneFrames, true);
        }
    }
    numNormalFrames = 1;
    processNormalVoice(inputs) {
        let maxValue = inputs[0].reduce((max, item) => max > item ? max : item, 0);
        this.peakAmplitude = this.peakAmplitude > maxValue ? this.peakAmplitude : maxValue;
        let avgValue = inputs[0].reduce((sum, item) => sum + item) / inputs[0].length;
        //this average doesn't need to be super accurate.
        this.normalAmplitude += avgValue / this.numNormalFrames;
        this.numNormalFrames++;
        return true;
    }

    processPeakVoice(inputs) {
        let maxValue = inputs[0].reduce((max, item) => max > item ? max : item, 0);
        this.peakAmplitude = this.peakAmplitude > maxValue ? this.peakAmplitude : maxValue;
        return true;
    }

    _kahanErrorBuf = null;
    _kahanErrorBufView = null;
    kahanSumOnline(observation, sampleIndex) {
        let byteOffset = sampleIndex * 4;
        let sum = this._roomToneProfileView.getFloat32(byteOffset, true);
        let y = observation - this._kahanErrorBufView.getFloat32(byteOffset, true);
        let t = sum + y;
        let c = (t - sum) - y;
        this._roomToneProfileView.setFloat32(byteOffset, t, true);
        this._kahanErrorBufView.setFloat32(byteOffset, c, true);
    }

    onMessage(message) {
        switch(message.data.eventType) {
            case 'roomToneStart':
                this.onRoomToneProcessingBegin();
                this.processingFn = this.processRoomTone;
                break;
            case 'roomToneEnd':
                this.onRoomToneProcessingComplete();
                this.processingFn = () => true;
                this.port.postMessage({ eventType: 'roomToneProfile', value: this._roomToneProfile });
                break;
            case 'voiceNormalStart':
                this.processingFn = this.processNormalVoice;
                break;
            case 'voiceNormalEnd':
                this.processingFn = () => true;
                this.port.postMessage({ eventType: 'voiceNormalAmplitude', value: this.normalAmplitude });
                break;
            case 'voicePeakStart':
                this.processingFn = this.processPeakVoice;
                break;
            case 'voicePeakEnd':
                this.processingFn = () => true;
                this.port.postMessage({ eventType: 'voicePeakAmplitude', value: this.peakAmplitude });
                break;
            case 'soundCheckComplete':
                this.processingFn = () => false;
                break;

        }
    }
}
registerProcessor('sound-check-processor', SoundCheckProcessor);