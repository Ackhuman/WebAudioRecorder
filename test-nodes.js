import { contextOptions, defaultCompressorSettings } from './wavRecording.service.js';
import { AudioNetworkService } from './audioNetwork.service.js';

export class TestNodes {
    _audioStream = null;
    _audioContext = null;
    _networkService = null;

    elements = {
        audTestFile: null
    };
    testCompression() {
        Object.getOwnPropertyNames(this.elements)
            .forEach(name => this.elements[name] = document.getElementById(name)); 
        let inputSource = this.createInputSource()
        this._audioContext = new AudioContext(contextOptions);
        this._networkService = new AudioNetworkService(this._audioContext);

        audTestFile.addEventListener('ended', () => {
            stopRecording();
        });
        
        let [src, analyzer, compressorNode, recorder] = await this._networkService.createAudioNetwork(inputSource);
        this._analyzer = analyzer;
        this._recorderNode = recorder;
        await startRecording();
        audTestFile.play();
    }
    createInputSource() { 
        return audioContext.createMediaElementSource(audTestFile);
    }
}


function startRecording() {   
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

function stopRecording() {        
    recorderNode.port.postMessage({ eventType: 'stop' });
    recorderNode.port.postMessage({ eventType: 'finish' });
}

function onWavError(err){
    let errTime = new Date().toString();
    let msg = `${errTime} \t Error in ${err.stack} \t ${err.name} \t ${err.message}`;
    saveAs(msg, `error-${errTime}.debug.txt`);
    WebSound.Service.Storage.DownloadData(`current-recorded-data-${errTime}`);
}