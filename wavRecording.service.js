import { WavProcessorStream } from "./wavProcessorStream.js";
import { WavFileStream, onWavError }  from './wavFileStream.js';
import { DeviceService } from './device.service.js';
import { AudioNetworkService } from './audioNetwork.service.js';

export class RecordingStates {
    static notStarted = {
        title: 'Not Started',
        message: null
    }
    static started = {
        title: 'Started',
        message: 'start'
    }
    static paused = {
        title: 'Paused',
        message: 'stop'
    }
    static stopped = {
        title: 'Stopped',
        message: 'stop'
    }
    static saved = {
        title: 'Saved',
        message: 'finish'
    }
}

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
    _recordingState = RecordingStates.notStarted;
    _processOnline = true;
    _streamToDisk = true;
    _analyzer = null;
    _recorderStatistics = {};
    _networkService = null;

    constructor() {
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
        this._inputSource = await this.getAudioSourceNode(this._audioStream)
        this._networkService = new AudioNetworkService(this._audioContext);
        let [analyzer, compressorNode, recorder] = await this._networkService.createAudioNetwork(this._inputSource);
        this._analyzer = analyzer;
        this._recorderNode = recorder;

        this._initialized = true;
    }
    
    getAudioSourceNode(audioStream) { 
        return this._audioContext.createMediaStreamSource(audioStream);
    }

    async Start() {
        if(!this._initialized){
            await this.Init();
        }
        let fileStream = await initFileStream();
        this._recorderNode.port.onerror = onWavError;
        this._updateRecordingState(RecordingStates.started);
        let processorStream = new WavProcessorStream(this._recorderNode.port);
        let fileWriter = new WavFileStream(fileStream, this._audioContext, 1);
        return processorStream.pipeTo(fileWriter);                
    }

    PauseOrResume() {
        let newState = this._recordingState === RecordingStates.started
            ? RecordingStates.paused
            : RecordingStates.started;
        this._updateRecordingState(newState);
    }

    Stop() {
        this._updateRecordingState(RecordingStates.stopped);
        //since we're streaming the file, just finish it immediately
        this._updateRecordingState(RecordingStates.saved);
        this._inputSource = null;
        this._audioStream.getTracks()
            .forEach(track => track.stop());
    }

    _updateRecordingState(newState) {
        let oldState = this._recordingState;
        let evt = new CustomEvent('recordingstatechanged', 
        {
            detail: {
                oldState: oldState.title,
                newState: newState.title
            }
        });
        window.dispatchEvent(evt);
        this._recordingState = newState;
        this._recorderNode.port.postMessage({ eventType: newState.message });
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

