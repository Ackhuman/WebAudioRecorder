(function() {    
    if (typeof(WebSound) === "undefined") {
        WebSound = {};
    }
    if (typeof(WebSound.Service) === "undefined") {
        WebSound.Service = {}; 
    }

    WebSound.Service.Device = deviceService();
    
    var recordingMethod = "lossless";

    function deviceService() {
        return {
            SetRecordingMethod: setRecordingMethod,
            GetRecordingMethod: getRecordingMethod,
            GetMediaRecorder: getMediaRecorder,
            GetMediaStream: getMediaStream,
            GetAvailableDevices: getAvailableDevices,
            GetAudioMimeType: getAudioMimeType,
            GetAudioFileExtension: getAudioFileExtension
        }
    }

    function setRecordingMethod(method) {        
        recordingMethod = method;
    }

    function getRecordingMethod() {        
        let selRecordingMethod = document.getElementById('selRecordingMethod');
        return recordingMethod = selRecordingMethod
            .options[selRecordingMethod.selectedIndex].value;
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

    function getAudioFileExtension(){
        let mimeType = getAudioMimeType();
        switch(mimeType) {
            case 'audio/wav':
                return 'wav';
            case 'audio/ogg':
                return 'ogg';
            case 'audio/webm':
                return 'weba';
            default:
                return '';
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