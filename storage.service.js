(function() {
    
    if (typeof(NeighborScience) === "undefined") {
        NeighborScience = {};
    }
    if (typeof(NeighborScience.Service) === "undefined") {
        NeighborScience.Service = {}; 
    }

    NeighborScience.Service.Storage = storageService();

    function storageService() {
        return {
            InitLossy: initLossy,
            InitLossless: initLossless,
            InitFileStream: initFileStream,
            HasAudio: () => audioChunks.length > 0,
            DownloadData: downloadData,
            DumpData: dumpData,
            DataAvailable: onDataAvailable,
            WriteWavHeader: writeWavHeader
        }
    }

    audioChunks = [];

    function initLossy(mediaRecorder) {
        mediaRecorder.addEventListener('dataavailable', onDataAvailable);
        return mediaRecorder;
    }
    var audioContext = null;
    var numChannels = null;
    var processOffline = true;
    var streamToDisk = true;
    function initLossless(_audioContext, _numChannels, _processOffline, _streamToDisk) {
        audioContext = _audioContext;
        numChannels = _numChannels;
        processOffline = _processOffline;
        streamToDisk = _streamToDisk;
    }

    function downloadData(userFileName) {
        let fileName = userFileName || new Date().toDateString();
        let mimeType = NeighborScience.Service.Device.GetAudioMimeType();
        let blobData = audioChunks
        if (mimeType === "audio/wav"){
            blobData = [encodeWav(audioChunks)];
        } 
        let file = new Blob(blobData, { type: mimeType });         
        saveAs(file, fileName);
    }

    function dumpData() {
        audioChunks.splice(0, audioChunks.length);
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
        const writable = await handle.createWritable();
        return writable;
    }

    function onDataAvailable(event) {
        let audioChunk = event;
        if(event.hasOwnProperty('data')){
            audioChunk = event.data;
        }
        if(!!audioChunk.slice){ //array of bits chunk
            audioChunks.push(...audioChunk);
        } else {
            audioChunks.push(audioChunk);
        }
    }

    
    function encodeWav(samples){
        var buffer = new ArrayBuffer(44 + samples.length * 2);
        var view = new DataView(buffer);    
        writeWavHeader(view, samples.length);        
        if (processOffline) {
            floatTo16BitPCM(view, 44, samples);    
        } else {
            writePCMValues(view, 44, samples);
        }
        return view;
    }

    function writeWavHeader(view, fileLength) {
        /* RIFF identifier */
        writeString(view, 0, 'RIFF');
        /* file length */
        view.setUint32(4, 36 + fileLength * 2, true);
        /* RIFF type */
        writeString(view, 8, 'WAVE');
        /* format chunk identifier */
        writeString(view, 12, 'fmt ');
        /* format chunk length */
        view.setUint32(16, 16, true);
        /* sample format (raw) */
        view.setUint16(20, 1, true);
        /* channel count */
        view.setUint16(22, numChannels, true);
        /* sample rate */
        view.setUint32(24, audioContext.sampleRate, true);
        /* byte rate (sample rate * block align) */
        view.setUint32(28, audioContext.sampleRate * 4, true);
        /* block align (channel count * bytes per sample) */
        view.setUint16(32, numChannels * 2, true);
        /* bits per sample */
        view.setUint16(34, 16, true);
        /* data chunk identifier */
        writeString(view, 36, 'data');
        /* data chunk length */
        view.setUint32(40, fileLength * 2, true);
        return view;
    }


    function writeString(view, offset, string){
        for (var i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    function writePCMValues(output, offset, input) {
        input.forEach((sample, index) => 
            output.setInt16(index * 2 + offset, sample, true)
        );
    }

    function floatTo16BitPCM(output, offset, input){
        input.forEach((sample, index) => {
            let clampedSample = Math.max(-1, Math.min(1, sample))
            let pcmValue = clampedSample < 0 
                ? clampedSample * 0x8000 
                : clampedSample * 0x7FFF;
            output.setInt16(index * 2 + offset, pcmValue, true);
        });
    }

})();