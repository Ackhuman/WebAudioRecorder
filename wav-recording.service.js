(function() {
    
    if (typeof(NeighborScience) === "undefined") {
        NeighborScience = {};
    }
    if (typeof(NeighborScience.Service) === "undefined") {
        NeighborScience.Service = {}; 
    }

    NeighborScience.Service.WavRecording = wavRecordingService();

    const recordingStates = {
        notStarted: 'Not Started',
        started: 'Started',
        paused: 'Paused',
        stopped: 'Stopped',
        saved: 'Saved'
    }

    function wavRecordingService() {
        return {
            Init: init,
            Start: startRecording,
            PauseOrResume: pauseOrResumeRecording,
            Stop: stopRecording,
            Download: downloadRecording,
            DumpData: dumpData,
            GetRecorderState: getRecorderState,
            GetAnalyzer: getAnalyzer
        }
    }
    
    var audioContext = null;
    var inputSource = null;
    var recorderNode = null;
    var audioStream = null;
    var recordingState = null;
    var processOnline = true;
    var streamToDisk = true;
    var analyzer = null;

    const contextOptions = { 
        latencyHint: 'playback',
        sampleRate: 44100 
    };

    function init() { 
        audioContext = new AudioContext(contextOptions);
        let sourceWorkletPromise = createSourceWorklet();
        let recorderWorkletPromise = createRecorderWorklet();
        audioContext.createBufferSource();
        analyzer = createAnalyzerNode();
        return Promise.all([sourceWorkletPromise, recorderWorkletPromise])
            .then(() => {
                let dest = inputSource.connect(analyzer)
                    .connect(recorderNode);
                return NeighborScience.Service.Storage.InitLossless(audioContext, 1, processOnline, streamToDisk);
            });
    }

    function getAnalyzer() {
        return analyzer;
    }

    function createSourceWorklet() { 
        return NeighborScience.Service.Device.GetMediaStream()
            .then(function(stream) {
                audioStream = stream;
                inputSource = audioContext.createMediaStreamSource(stream);
            });
    }

    function createRecorderWorklet() {
        return audioContext.audioWorklet.addModule('wav-processor.js')
            .then(function() {
                recorderNode = new AudioWorkletNode(audioContext, 'wav-processor');
                if (processOnline) {
                    recorderNode.port.postMessage({ eventType: 'processOnline' });
                }
            });
    }

    function createAnalyzerNode() {        
        let analyzer = audioContext.createAnalyser();
        analyzer.minDecibels = -90;
        analyzer.maxDecibels = -10;
        analyzer.smoothingTimeConstant = 0.85;
        return analyzer;
    }

    function startRecording() {
        if (inputSource == null) {
            init().then(() => startRecording());
        } else {
            //recorderNode.port.onmessage = onWavEvent;
            initFileStream()
                .then(function(fileStream) {
                    let audioStream = processorToReadableStream(recorderNode.port);
                    return {audioStream, fileStream};
                })
                .then(function({ audioStream, fileStream }) {
                    recorderNode.port.onerror = onWavError;
                    recorderNode.port.postMessage({ eventType: 'start' });
                    updateRecordingState(recordingStates.started);
                    streamAudioToFile(audioStream, fileStream);
                });
        }
    }

    function pauseOrResumeRecording() {
        if(recordingState === recordingStates.started){
            recorderNode.port.postMessage({ eventType: 'stop' });
            updateRecordingState(recordingStates.paused);
        } else { 
            recorderNode.port.postMessage({ eventType: 'start' });
            updateRecordingState(recordingStates.started);
        }
    }

    function stopRecording() {
        recorderNode.port.postMessage({ eventType: 'stop' });
        updateRecordingState(recordingStates.stopped);
    }

    function downloadRecording(userFileName) {
        if(!streamToDisk) {
            NeighborScience.Service.Storage.DownloadData(userFileName);
        }
        recorderNode.port.postMessage({ eventType: 'finish' });
        inputSource = null;
        audioStream.getTracks().forEach(track => track.stop());
        updateRecordingState(recordingStates.saved);
    }

    function dumpData() {
        NeighborScience.Service.Storage.DumpData();
        recorderNode.port.postMessage({ eventType: 'finish' });
        inputSource = null;
        audioStream.getTracks().forEach(track => track.stop());
        updateRecordingState(recordingStates.notStarted);
    }

    function updateRecordingState(newState){
        let oldState = recordingState;
        let evt = new CustomEvent('recordingstatechanged', 
        {
            detail: {
                oldState: oldState,
                newState: newState
            }
        });
        window.dispatchEvent(evt);
        recordingState = newState;
    }

    function getRecorderState(){
        return recordingState;
    }


    function onWavEvent(evt) {
        switch(evt.data.eventType){
            case 'dataavailable':
                const audioData = evt.data.audioBuffer;
                NeighborScience.Service.Storage.DataAvailable(audioData);
                break;
        }
    }
    async function initFileStream() {
        let mimeType = NeighborScience.Service.Device.GetAudioMimeType();
        let fileExtension = NeighborScience.Service.Device.GetAudioFileExtension();
        let acceptConfig = Object.defineProperty({}, mimeType, { get: () => [fileExtension] });
        const options = {
            types: [
                {
                    description: 'Audio Files',
                    accept: acceptConfig
                },
            ],
        };
        const handle = await window.showSaveFilePicker(options);
        const fileStream = await handle.createWritable();        
        return fileStream;
        
    }
    function streamAudioToFile(audioStream, fileStream) {
        //todo: finish with file headers
        //note: pipeTo is only supported in Chrome.
        let headerWriteMethod = NeighborScience.Service.Storage.WriteWavHeader;
        let headerLengthBytes = 44;
        let writableFileStream = fileWritableStreamToWritableStream(fileStream, headerWriteMethod, headerLengthBytes);
        return audioStream.pipeTo(writableFileStream);
    }
    var buffer = new ArrayBuffer(128);
    function writeBuffer(fileWriter, audioBits) {
        audioBits.map((bit, i) => buffer[i] = bit);
        return fileWriter.write({ type: 'write', data: buffer });
    }

    function onError(err) {
        console.log(err.message);
    }

    function processorToReadableStream(port) {
        return new ReadableStream({
            start(controller) {
                port.onmessage = evt => {
                    switch(evt.data.eventType) {
                        case "finish":
                            controller.close();
                            break;
                        case "dataavailable":
                            controller.enqueue(evt.data.audioBuffer);
                            break;
                    }
                }
                port.onerror = err => {
                    controller.error(err);
                }
            }
        });
    }

    function fileWritableStreamToWritableStream(fileStream, headerWriteMethod, headerLengthBytes) {
        let bytesWritten = 0;
        const writableStream = new WritableStream({
            // Implement the sink
            async start(controller) {
                // We should resize the file to 0 to overwrite it.
                await fileStream.truncate(0);
                if(headerLengthBytes) {
                    //Currently it's not possible to seek past the end of a file.
                    //So first, we need to "truncate" which really just means to resize it.
                    //May as well add some extra room since we're going to be filling it anyway.
                    await fileStream.truncate(headerLengthBytes);
                    return fileStream.seek(headerLengthBytes);
                }
            },
            async write(chunk) {
                bytesWritten += chunk.byteLength;
                return fileStream.write({ type: 'write', data: chunk });
            },
            async close() {
                let promise = Promise.resolve();
                if (headerWriteMethod) {
                    let headerBuffer = new ArrayBuffer(headerLengthBytes);
                    let view = new DataView(headerBuffer);
                    let headerBytes = headerWriteMethod(view, bytesWritten);
                    //Seek back to the beginning of the file and write the header using the size counted.
                    promise = fileStream.seek(0)
                        .then(() => fileStream.write({ type: 'write', data: headerBytes.buffer }));
                }
                return promise.then(() => fileStream.close());
            },
            abort(err) {
                onWavError(err);
            }
        });
        return writableStream;
    }

    function onWavError(err){
        let errTime = new Date().toString();
        let msg = `${errTime} \t Error in ${err.stack} \t ${err.name} \t ${err.message}`;
        saveAs(msg, `error-${errTime}.debug.txt`);
        NeighborScience.Service.Storage.DownloadData(`current-recorded-data-${errTime}`);
    }

})();