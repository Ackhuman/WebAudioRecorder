class Compressor extends AudioWorkletProcessor {
    NUM_SAMPLES = 128;
    constructor() {
        super();
        this.port.onmessage = this.onMessage.bind(this);        
        this._buffer = new ArrayBuffer(this.NUM_SAMPLES * 2);
        this._view = new DataView(this._buffer);
    }
    //parameters
    isRecording = false;
    isSampling = false;
    _buffer = null;
    _view = null;

    //just copied audacity settings
    noiseFloorDB = -40;
    thresholdDB = -10;
    ratioToOne = 2;
    attackTimeSecs = 0.2;
    releaseTimeSecs = 1;
    compressFromPeak = false;
    amplifyToMax = true;

    process (inputs, outputs, parameters) {
        if (!this.isRecording && !this.isSampling) {
            return false;
        }
        this.port.postMessage({
            eventType: 'dataavailable',
            audioBuffer: this.writeBuffer(inputs)
        });
        return true;
    }
    maxdB = 0;
    compress(inputs){
        let inputStream = inputs[0];
        let channelIndex = 0;
        while(channelIndex < inputStream.length) {
            let sampleIndex = 0;
            let channel = inputStream[channelIndex];
            while(sampleIndex < channel.length){
                
                sampleIndex++;
            }
            channelIndex++;
        }
        //find threshold
        //if audio is below noise floor, `continue`
        //if audio is above noise floor, but before attack time, `continue`
        //if audio is above threshold, divide it by the ratio
        //if amplify is true, amp max amplitude to -1dB
    }
    //example: noise=2
    parseSettings(settingsStr) {
        let args = settingsStr.split(',');
        args.forEach(arg => {
            let params = arg.split('=');
            let paramName = params[0];
            let paramValue = params[1];
            switch(paramName) {
                case 'noise':
                    this.noiseFloorDB = parseInt(paramValue);
                    break;
                case 'noise':
                    this.thresholdDB = parseInt(paramValue);
                    break;
                case 'noise':
                    this.ratioToOne = parseFloat(paramValue);
                    break;
                case 'noise':
                    this.attackTimeSecs = parseFloat(paramValue);
                    break;
                case 'noise':
                    this.releaseTimeSecs = parseFloat(paramValue);
                    break;
            }
        })
    }
}
registerProcessor('compressor', NoiseRemover);