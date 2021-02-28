(function() {
    if (typeof(WebSound) === "undefined") {
        WebSound = {};
    }
    if (typeof(WebSound.Service) === "undefined") {
        WebSound.Service = {}; 
    }

    WebSound.Service.TestNodes = {
        Init: init,
        TestCompression: testCompression
    }
    const elements = {
        audTestFile: null
    };
    const contextOptions = { 
        latencyHint: 'playback',
        sampleRate: 44100 
    };

    var audioContext = null;
    var inputSource = null;
    var recorderNode = null;
    var audioStream = null;
    function init() {
        Object.getOwnPropertyNames(elements)
            .forEach(name => elements[name] = document.getElementById(name));
    }

    function testCompression() {
        audioContext = new AudioContext(contextOptions);
        let sourceWorkletPromise = createSourceWorklet();
        let compressorWorkletPromise = createCompressorWorklet();
        let recorderWorkletPromise = createRecorderWorklet();
        audioContext.createBufferSource();

        audTestFile.addEventListener('ended', () => {
            stopRecording();
        });
        return Promise.all([sourceWorkletPromise, compressorWorkletPromise, recorderWorkletPromise])
            .then(([src, compressorNode, recorder]) => {
                let dest = createAudioNetwork(inputSource, compressorNode, recorderNode);
                return WebSound.Service.Storage.InitLossless(audioContext, 1, true, true);
            })
            .then(() => {
                return startRecording();
            })
            .then(() => {
                audTestFile.play();
            });        
    }

    function createRecorderWorklet() {
        return audioContext.audioWorklet.addModule('wav-processor.js')
            .then(function() {
                recorderNode = new AudioWorkletNode(audioContext, 'wav-processor', { channelCount: 1 });
                recorderNode.port.postMessage({ eventType: 'processOnline' });
                return recorderNode;
            });
    }

    var defaultCompressorSettings = {
        noiseFloorDB: -45,
        thresholdDB: -25,
        ratioToOne: 2.5,
        attackTimeSecs: 0.1,
        releaseTimeSecs: 1,
        knee0to1: 0.0,
        compressFromPeak: false,
        amplifyToMax: false,
        peakDB: -1
    };

    function createCompressorWorklet() {
        return audioContext.audioWorklet.addModule('compressor.js')
            .then(function() {
                let compressorNode = new AudioWorkletNode(audioContext, 'compressor', { channelCount: 1 });
                //todo: can I just post the object straight through?
                compressorNode.port.postMessage({ compressorSettings: JSON.stringify(defaultCompressorSettings) });
                return compressorNode;
            });
    }
    
    function createSourceWorklet() { 
        inputSource = audioContext.createMediaElementSource(audTestFile);
    }

    function createAudioNetwork(...nodes) {
        return nodes.reduce((network, node) => network.connect(node));
    }
    
    function startRecording() {
        if (inputSource == null) {
            return init().then(() => startRecording());
        } else {
            //recorderNode.port.onmessage = onWavEvent;
            return initFileStream()
                .then(function(fileStream) {
                    let audioStream = processorToReadableStream(recorderNode.port);
                    return {audioStream, fileStream};
                })
                .then(function({ audioStream, fileStream }) {
                    recorderNode.port.onerror = onWavError;
                    recorderNode.port.postMessage({ eventType: 'start' });
                    streamAudioToFile(audioStream, fileStream);
                });
        }
    }

    function stopRecording() {        
        recorderNode.port.postMessage({ eventType: 'stop' });
        recorderNode.port.postMessage({ eventType: 'finish' });
    }
    async function initFileStream() {
        let fileExtension = WebSound.Service.Device.GetAudioFileExtension();
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
    function streamAudioToFile(audioStream, fileStream) {
        //todo: finish with file headers
        //note: pipeTo is only supported in Chrome.
        let headerWriteMethod = WebSound.Service.Storage.WriteWavHeader;
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
        WebSound.Service.Storage.DownloadData(`current-recorded-data-${errTime}`);
    }
})();