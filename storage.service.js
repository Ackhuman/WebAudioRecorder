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
            DownloadData: downloadData,
            DataAvailable: onDataAvailable
        }
    }

    audioChunks = [];

    function initLossy(mediaRecorder) {
        mediaRecorder.addEventListener('dataavailable', onDataAvailable);
        return mediaRecorder;
    }
    var audioContext = null;
    var numChannels = null;
    function initLossless(_audioContext, _numChannels) {
        audioContext = _audioContext;
        numChannels = _numChannels;
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

    function backupData() {

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
    
        /* RIFF identifier */
        writeString(view, 0, 'RIFF');
        /* file length */
        view.setUint32(4, 36 + samples.length * 2, true);
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
        view.setUint32(40, samples.length * 2, true);
    
        floatTo16BitPCM(view, 44, samples);    
        return view;
    }


    function writeString(view, offset, string){
        for (var i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    function floatTo16BitPCM(output, offset, input){
        for (var i = 0; i < input.length; i++, offset+=2){
            var s = Math.max(-1, Math.min(1, input[i]));
            let pcmValue = s < 0 ? s * 0x8000 : s * 0x7FFF;
            output.setInt16(offset, pcmValue, true);
        }
    }

})();