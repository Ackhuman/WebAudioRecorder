import { WavProcessorStream } from "../wavProcessorStream.js";
import { WavFileStream, onWavError }  from '../wavFileStream.js';
import { DeviceService } from './device.service.js';
import { AudioNetworkService } from './audioNetwork.service.js';
import { RecordingStates, RecordingStateService } from './recordingState.service.js';

export const contextOptions = { 
    latencyHint: 'playback',
    sampleRate: 44100 
};

export class WavRecordingService {
    _initialized = false;
    _audioContext = null;
    _inputSource = null;
    _recorderNode = null;
    _audioStream = null;
    _processOnline = true;
    _streamToDisk = true;
    _analyzer = null;
    _networkService = null;

    constructor() {
        this._stateService = new RecordingStateService();
    }

    async GetAnalyzer() {
        if(!this._initialized) {
            await this.Init();
        }
        return this._analyzer;
    }

    async Init() {
        this._audioContext = new AudioContext(contextOptions);
        this._audioStream = await DeviceService.GetMediaStream();
        this._inputSource = await this._audioContext.createMediaStreamSource(this._audioStream);
        this._networkService = new AudioNetworkService(this._audioContext);
        let [analyzer, compressorNode, recorder] = await this._networkService.createAudioNetwork(this._inputSource);
        this._analyzer = analyzer;
        this._recorderNode = recorder;
        this._stateService.addPort(recorder.port);
        this._initialized = true;
    }
    
    async Start() {
        if(!this._initialized){
            await this.Init();
        }
        let fileStream = await initFileStream();
        this._recorderNode.port.onerror = onWavError;
        this._stateService.start();
        let processorStream = new WavProcessorStream(this._recorderNode.port);
        let fileWriter = new WavFileStream(fileStream, this._audioContext, 1);
        return processorStream.pipeTo(fileWriter);                
    }

    PauseOrResume() {
        this._stateService.pauseOrResume();
    }

    Stop() {
        this._stateService.stop();
        this._inputSource = null;
        this._audioStream.getTracks()
            .forEach(track => track.stop());
    }
}
async function initFileStream() {
    let fileExtension = DeviceService.GetAudioFileExtension();
    //let acceptConfig = Object.defineProperty({}, mimeType, { value: [`.${fileExtension}`] });
    let acceptConfig = { 'audio/*': [`.${fileExtension}`] };
    const options = {
        types: [
            {
                description: 'Audio Files',
                accept: acceptConfig
            },
        ],
        multiple: false
    };
    const handle = await window.showSaveFilePicker(options);
    const fileStream = await handle.createWritable();        
    return fileStream;        
}

