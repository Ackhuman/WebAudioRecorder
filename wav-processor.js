class WavProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.port.onmessage = this.onMessage.bind(this);
    }
    // static get parameterDescriptors() {
    //     return [
    //         {
    //             name: 'isRecording',
    //             defaultValue: 0,
    //             automationRate: 'a-rate'
    //         },
    //         {
    //             name: 'isMono',
    //             defaultValue: 1,
    //             automationRate: 'k-rate'
    //         }
    //     ];
    // }

    //parameters
    isRecording = false;
    isFinished = false;
    isMono = true;
    isOnlinePcm = false;

    _recordingStopped() {
        this.port.postMessage({
            eventType: 'stop'
        });
    }
    // constructor(){
    //     super();
    //     this._bufferSize = 4096;
    // }
    process (inputs, outputs, parameters) {
        if (!this.isRecording) {
            return !this.isFinished;
        }
        let buffer = this.isMono
            ? this.writeMono(inputs)
            : this.writeInterleaved(inputs);
        if(this.isOnlinePcm) {
            buffer = this.write16BitPcm(buffer);
        }
        this.port.postMessage({
            eventType: 'dataavailable',
            audioBuffer: buffer
        });
        return true;
    }

    write16BitPcm(inputs) {
        return inputs.map(inputSample => {            
            var outputSample = Math.max(-1, Math.min(1, inputSample));
            let pcmValue = outputSample < 0 
                ? outputSample * 0x8000 
                : outputSample * 0x7FFF;
            return pcmValue;
        })
    }

    writeMono(inputs) {
        //check if already mono
        if(inputs[0].length === 1){
            return inputs[0][0];
        }
        //mix down to one channel
        let inputStream = inputs[0];            
        let monoBuffer = [];
        var i = 0;
        while(i < inputStream[0].length) {
            let monoValue = (inputStream[0][i] + inputStream[1][i]) / 2;
            monoBuffer.push(monoValue);
            i++;
        }
        return monoBuffer;
    }

    writeInterleaved(inputs) {
        let interleavedBuffer = [];
        //interleave the channel data and push it to the buffer
        let inputStream = inputs[0];            
        inputStream[0].forEach((_, index) => {
            inputStream.forEach(channel => {
                interleavedBuffer.push(channel[index]);
            })
        });
        return interleavedBuffer;
    }

    onMessage(evt) {
        let messageType = evt.data.eventType;
        switch(messageType) {
            case 'start':
                this.isRecording = true;
                break;
            case 'stop':
                this.isRecording = false;
                break;
            case 'finish':
                this.isFinished = true;
                break;
            case 'setStereo':
                this.isMono = false;
                break;
            case 'processOnline':
                this.isOnlinePcm = true;
                break;
        }
    }
}
registerProcessor('wav-processor', WavProcessor);