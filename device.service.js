export class DeviceService {
    static GetAvailableDevices() {
        return navigator.mediaDevices.enumerateDevices();
    }

    static GetMediaStream() {
        return navigator.mediaDevices.getUserMedia({ audio: true })
    }

    static async GetMediaRecorder() {
        let options = { mimeType: DeviceService.GetAudioCodec() };
        let stream = await DeviceService.GetMediaStream();
        return new MediaRecorder(stream, options);
    }
    
    static GetAudioMimeType() {
        let wavType = 'audio/wav';
        // if(recordingMethod == "lossless"){
             return wavType;
        // }
        // let oggType = 'audio/ogg';
        // if(MediaRecorder.isTypeSupported(oggType)) {
        //     return oggType; 
        // }
        // let webmType = 'audio/webm';
        // if(MediaRecorder.isTypeSupported(webmType)) {
        //     return webmType; 
        // } else {
        //     throw new Error("Codecs not supported");
        // }
    }

    static GetAudioFileExtension(){
        let mimeType = DeviceService.GetAudioMimeType();
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
    static GetAudioCodec() {
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
}