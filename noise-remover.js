class Compressor extends AudioWorkletProcessor {
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
        
    }

    sampleRoomTone()

}
registerProcessor('noise-remover', Compressor);