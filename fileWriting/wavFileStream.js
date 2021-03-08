import { FileWritableStream } from './fileWritableStream.js';

const headerLengthBytes = 44;
const numChannels = 1;

export class WavFileStream extends FileWritableStream {
    constructor(fileStream, audioContext) {
        super(fileStream, getWavHeaderFn(audioContext), headerLengthBytes, onWavError);
        this._audioContext = audioContext;
    }
    bytesWritten = 0;
}
function getWavHeaderFn(audioContext) {
    return function writeWavHeader(view, fileLength) {
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
}

function writeString(view, offset, string){
    for (var i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

export function onWavError(err) {
    let errTime = new Date().toString();
    let msg = `${errTime} \t Error in ${err.stack} \t ${err.name} \t ${err.message}`;
    console.error(msg);
}