export const defaultCompressorSettings = {
    noiseFloorDB: -40,
    thresholdDB: -10,
    ratioToOne: 2.5,
    attackTimeSecs: 0.2,
    releaseTimeSecs: 1,
    knee0to1: 0.0,
    compressFromPeak: false,
    amplifyToMax: false,
    peakDB: -1
};

export class AudioNetworkService {
    audioContext = null;

    constructor(audioContext) {
        this.audioContext = audioContext;
    }
    
    async createAudioNetwork(src){
        let initSteps = [
            this.createCompressorWorklet(),
            this.createRecorderWorklet(),
        ];
        this.audioContext.createBufferSource();
        let analyzer = this.createAnalyzerNode();
        let [compressorNode, recorder] = await Promise.all(initSteps);
        this.connectAudioNetwork(
            src, 
            analyzer, 
            compressorNode, 
            recorder
        );
        return [analyzer, compressorNode, recorder];
    }
    

    async createRecorderWorklet() {
        await this.audioContext.audioWorklet.addModule('wav-processor.js');
        let recorderNode = new AudioWorkletNode(
            this.audioContext, 
            'wav-processor', 
            { channelCount: 1 }
        );
        return recorderNode;
    }

    connectAudioNetwork(...nodes) {
        return nodes.reduce((network, node) => network.connect(node));
    }
    
    async createCompressorWorklet() {
        await this.audioContext.audioWorklet.addModule('compressor.js')
        let compressorNode = new AudioWorkletNode(
            this.audioContext, 
            'compressor', 
            { channelCount: 1 }
        );
        //todo: can I just post the object straight through?
        compressorNode.port.postMessage({ compressorSettings: JSON.stringify(defaultCompressorSettings) });
        return compressorNode;
    }

    createAnalyzerNode() {        
        let analyzer = this.audioContext.createAnalyser();
        analyzer.minDecibels = -90;
        analyzer.maxDecibels = -10;
        analyzer.smoothingTimeConstant = 0.85;
        return analyzer;
    }
}