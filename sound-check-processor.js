class SoundCheckProcessor extends AudioWorkletProcessor {
    NUM_SAMPLES = 128;
    FLOAT_BYTE_LENGTH = 4;
    SAMPLES_PER_SECOND = 44100;
    constructor() {
        super();
        this.port.onmessage = this.onMessage.bind(this);        
        this._roomToneProfile = new Float32Array(this.NUM_SAMPLES);
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
        this._kahanErrorBuf = new Float32Array(this.NUM_SAMPLES);
    }
    
    processRoomTone(inputs) {
        let inputStream = inputs[0];
        //just use one channel for now: otherwise we have to account for mono vs. stereo because the math is different.
        let channel = inputStream[0];
        channel.forEach((sample, sampleIndex) =>{
            //calculates an average for the stream.
            //this may have floating-point swamping issues.
            //it may also be better to find which frequencies are represented the most at certain volume levels
            //  i.e., those that are at the noise floor, those that are above the noise floor (for very noisy audio)
            //let newValue = ((currentValue * this._numRoomToneFrames) + inputStream[sampleIndex]) / (this._numRoomToneFrames + 1)
            //this._roomToneProfileView.setFloat32(sampleIndex * 4, newValue, true);
            this.kahanSumOnline(sample, sampleIndex);
        });
        this._numRoomToneFrames++;
        return true;
    }
    onRoomToneProcessingComplete() {
        return this._roomToneProfile.map((sum) =>
            sum / this._numRoomToneFrames
        );
    }

    numNormalFrames = 1;
    numPeaks = 0;
    processNormalVoice(inputs) {
        let channel = inputs[0][0];
        let maxValue = channel.reduce((max, item) => max > item ? max : item, 0);
        if(maxValue == 1 || maxValue == -1) {
            this.numPeaks++;
        }
        this.peakAmplitude = this.peakAmplitude > maxValue ? this.peakAmplitude : maxValue;
        let avgValue = channel.reduce((sum, item) => sum + item) / inputs[0].length;
        //this average doesn't need to be super accurate.
        this.normalAmplitude += avgValue / this.numNormalFrames;
        this.numNormalFrames++;
        return true;
    }

    numPeakFrames = 0;
    processPeakVoice(inputs) {
        let maxValue = inputs[0][0].reduce((max, item) => max > item ? max : item, 0);
        if(maxValue == 1 || maxValue == -1) {
            this.numPeaks++;
        }
        this.peakAmplitude = this.peakAmplitude > maxValue ? this.peakAmplitude : maxValue;
        this.numPeakFrames++;
        return true;
    }

    _kahanErrorBuf = null;
    _kahanErrorBufView = null;
    kahanSumOnline(observation, sampleIndex) {
        let sum = this._roomToneProfile[sampleIndex];
        let y = observation - this._kahanErrorBuf[sampleIndex];
        let t = sum + y;
        let c = (t - sum) - y;
        this._roomToneProfile[sampleIndex] = t;
        this._kahanErrorBuf[sampleIndex] = c;
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
                this.port.postMessage({ eventType: 'normalPctPeaks', value: (this.numPeaks / this.numNormalFrames) });
                break;
            case 'voicePeakStart':
                this.processingFn = this.processPeakVoice;
                break;
            case 'voicePeakEnd':
                this.processingFn = () => true;
                this.port.postMessage({ eventType: 'voicePeakAmplitude', value: this.peakAmplitude });
                this.port.postMessage({ eventType: 'peakNumPeaks', value: (this.numPeaks / this.numPeakFrames) });
                break;
            case 'soundCheckComplete':
                this.processingFn = () => false;
                break;

        }
    }
}
registerProcessor('sound-check-processor', SoundCheckProcessor);