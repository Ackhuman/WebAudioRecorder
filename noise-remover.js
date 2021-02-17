class NoiseRemover extends AudioWorkletProcessor {
    NUM_SAMPLES = 128;
    constructor() {
        super();
        this.port.onmessage = this.onMessage.bind(this);        
        this._buffer = new ArrayBuffer(this.NUM_SAMPLES * 2);
        this._view = new DataView(this._buffer);
    }
    //parameters
    isRecording = false;
    isSampling = false;
    _buffer = null;
    _view = null;

    process (inputs, outputs, parameters) {
        if (!this.isRecording && !this.isSampling) {
            return false;
        }
        this.port.postMessage({
            eventType: 'dataavailable',
            audioBuffer: this.writeBuffer(inputs)
        });
        return true;
    }
    
    onMessage(evt) {
        let messageType = evt.data.eventType;
        switch(messageType) {
            case 'sampleRoomTone':
                this.isSampling = true;
                break;
            case 'start':
                this.isRecording = true;
                this.isSampling = false;
                break;
            case 'stop':
                this.isRecording = false;
                break;
            default:
                this.settings = messageType;
        }
    }

    sampleRoomTone()

}
registerProcessor('noise-remover', NoiseRemover);