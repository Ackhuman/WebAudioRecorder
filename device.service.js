(function() {    
    if (typeof(NeighborScience) === "undefined") {
        NeighborScience = {};
    }
    if (typeof(NeighborScience.Service) === "undefined") {
        NeighborScience.Service = {}; 
    }

    NeighborScience.Service.Device = deviceService();
    
    var recordingMethod = "lossless";

    function deviceService() {
        return {
            SetRecordingMethod: setRecordingMethod,
            GetMediaRecorder: getMediaRecorder,
            GetMediaStream: getMediaStream,
            GetAvailableDevices: getAvailableDevices,
            GetAudioMimeType: getAudioMimeType
        }
    }

    function setRecordingMethod(method) {        
        recordingMethod = method;
    }

    function getAvailableDevices() {
        return navigator.mediaDevices.enumerateDevices();
    }

    function getMediaStream() {
        return navigator.mediaDevices.getUserMedia({ audio: true })
    }

    async function getMediaRecorder() {
        let options = { mimeType: getAudioCodec() };
        let stream = await getMediaStream();
        return new MediaRecorder(stream, options);
    }
    function getAudioMimeType() {
        let wavType = 'audio/wav';
        if(recordingMethod == "lossless"){
            return wavType;
        }
        let oggType = 'audio/ogg';
        if(MediaRecorder.isTypeSupported(oggType)) {
            return oggType; 
        }
        let webmType = 'audio/webm';
        if(MediaRecorder.isTypeSupported(webmType)) {
            return webmType; 
        } else {
            throw new Error("Codecs not supported");
        }
    }
    //Gets the MIME type of the audio codec
    function getAudioCodec() {
        let oggType = 'audio/ogg;codecs=opus';
        if(MediaRecorder.isTypeSupported(oggType)) {
            return oggType; 
        }
        let webmType = 'audio/webm;codecs=opus';
        if(MediaRecorder.isTypeSupported(webmType)) {
            return webmType; 
        } else {
            throw new Error("Codecs not supported");
        }
    }
})();