class Compressor extends AudioWorkletProcessor {
    NUM_SAMPLES = 128;
    SAMPLES_PER_SECOND = 44100;
    constructor() {
        super();
        this.port.onmessage = this.onMessage.bind(this);
    }
    // for the defaults I just copied audacity's settings
    compressorSettings = {
        noiseFloorDB: -40,
        thresholdDB: -10,
        ratioToOne: 2,
        attackTimeSecs: 0.2,
        releaseTimeSecs: 1,
        knee0to1: 0.0,
        compressFromPeak: false,
        amplifyToMax: true,
        peakDB: -1
    };
    //some settings will be preprocessed to avoid doing a lot of mults/divs
    settingsInSamples = {
        noiseFloor: 0,
        threshold: 0,
        kneeLowerBound: 0,
        attackTimeSamples: 0,
        releaseTimeSamples: 0,
        peak: 0
    }
    //since we are processing the audio online we have to keep track of statistics about the stream
    compressorState = {
        numSamplesAboveNoiseFloor: 0,
        numSamplesBelowNoiseFloor: 0,
        //online amplification is going to be difficult because we need to keep a buffer
        //  of the peak sample, but how do we ensure there is always a peak in the buffer
        //  while expiring them after a certain time?
        peaks: [
            
        ]
    }

    process (inputs, outputs, parameters) {
        if (!this.isRecording && !this.isSampling) {
            return false;
        }
        compress(inputs, outputs);
        return true;
    }
    //main loop for compressor
    compress(inputs, outputs){
        let inputStream = inputs[0];
        let outputStream = outputs[0];
        let channelIndex = 0;
        while(channelIndex < inputStream.length) {
            this.shouldCompressSample(inputStream, outputStream, channelIndex);
            channelIndex++;
        }
    }
    //handle the process for a single channel
    handleChannel(inputStream, outputStream, channelIndex){
        let sampleIndex = 0;
        let inputChannel = inputStream[channelIndex];
        let outputChannel = outputStream[channelIndex];
        //loop through the channel's samples and compress if we should do that
        while(sampleIndex < inputChannel.length){
            let shouldCompress = this.shouldCompressSample(sample);
            if(shouldCompress){
                sample = this.getCompressedSample(sample);
            }
            outputChannel[sampleIndex] = sample;
            sampleIndex++;
        }
        //if amplify is true, amp max amplitude to -1dB
        //this may not be very useful because of the very short timeframe
        if(this.amplifyToMax){
            this.amplifyFrame(outputChannel)
        }
    }
    //get the compressed value of the sample
    //todo: implement soft knee. Not sure how to do this because I'm very stupid
    getCompressedSample(sample, knee) {
        return ((sample - this.settingsInSamples.threshold) / this.compressorSettings.ratioToOne) 
            + this.settingsInSamples.threshold;
    }
    //do not use yet. I need to keep track of peaks in a buffer that drops expired values
    amplifyFrame(outputChannel) {
        let maxSample = inputChannel.reduce((max, sample) => sample > max ? sample : max);
        let amplifyAmount = this.settingsInSamples.peak - maxSample;
        if(maxSample < this.settingsInSamples.peak) {
            outputChannel.forEach((sample, index) => {
                outputChannel[index] = sample + amplifyAmount;
            });
        }
    }
    //checks whether or not the sample should be compressed, as well as updating the statistics for the stream
    shouldCompressSample(sample) {
        //Since this runs online, we need to keep track of the number of samples above the noise floor
        //  in order to make the attack time work.
        //  Reset the count when we've passed the release time.
        if(sample >= this.settingsInSamples.noiseFloor) {
            this.compressorState.numSamplesAboveNoiseFloor++;
        } else {
            this.compressorState.numSamplesBelowNoiseFloor++;
        }
        let beforeAttack = this.compressorState.numSamplesAboveNoiseFloor < this.settingsInSamples.attackTimeSamples;
        let afterRelease = this.compressorState.numSamplesBelowNoiseFloor >= this.settingsInSamples.releaseTimeSamples;
        //reset the release count if we're past the attack threshold
        if (beforeAttack) {
            this.compressorState.numSamplesBelowNoiseFloor = 0;
        }
        //reset the attack count if we're past the release threshold
        if (afterRelease) {
            this.compressorState.numSamplesAboveNoiseFloor = 0;
        }
        //if we're before the attack time or after the release time, don't compress
        if(beforeAttack || afterRelease) {
            return false;
        }
        //if above threshold, compress
        if(sample > this.settingsInSamples.threshold) {
            return true;
        }
        //if a knee is set and above the lower bound, compress
        if(this.settingsInSamples.kneeLowerBound > 0 && sample > this.settingsInSamples.kneeLowerBound) {
            return true;
        }
        return false;
    }

    //preprocess the settings values so we can avoid doing as much math on the stream
    getSettingsSampleValues() {
        this.settingsInSamples.attackTimeSamples = this.timeToSampleCount(this.compressorSettings.attackTimeSecs);
        this.settingsInSamples.releaseTimeSamples = this.timeToSampleCount(this.compressorSettings.releaseTimeSecs);
        this.settingsInSamples.noiseFloor = this.dBFSToSample(this.compressorSettings.noiseFloorDB);
        this.settingsInSamples.threshold = this.dBFSToSample(this.compressorSettings.thresholdDB);
        //this starts the knee at half of the range between the noise floor and threshold.
        //  no idea if this is valid haha lol
        this.settingsInSamples.kneeLowerBound = this.compressorSettings.knee0to1 
            * ((this.settingsInSamples.threshold - this.settingsInSamples.noiseFloor) / 2)
        this.settingsInSamples.peak = this.dBFSToSample(this.compressorSettings.peakDB);
    }
    //the only message that's supported thus far is a serialized settings object
    onMessage(evt) {
        let newCompressorSettings = JSON.parse(evt.data.compressorSettings);
        Object.assign(this.compressorSettings, newCompressorSettings);
    }
    //convert a -1 to 1 sample value to DBFS
    sampleToDBFS(sample) {
        return 20 * Math.log10(sample);
    }
    //convert DBFS to a -1 to 1 sample value
    dBFSToSample(dbfs) {
        return Math.pow(10, dbfs / 20.0)
    }
    //convert an amount of time in seconds to a number of samples
    timeToSampleCount(timeSeconds){
        return timeSeconds * this.SAMPLES_PER_SECOND
    }
    //convert a number of samples to a time in seconds.
    sampleCountToSeconds(numSamples) {
        return numSamples / this.SAMPLES_PER_SECOND;
    }
}
registerProcessor('compressor', Compressor);