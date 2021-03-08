import { contextOptions } from './wavRecording.service.js';
import { DeviceService } from './device.service.js';
import { DialogService } from './dialog.service.js';

export class SoundCheckService {
    _audioContext = null;
    
    async onSoundCheckStarted() {        
        this._audioContext = new AudioContext(contextOptions);
        let sourceWorkletPromise = createSourceWorklet();
        let soundCheckWorkletPromise = createSoundCheckWorklet();
        this._audioContext.createBufferSource();
        let [src, soundCheckProcessor] = Promise.all([sourceWorkletPromise, soundCheckWorkletPromise])
        inputSource.connect(soundCheckProcessor);
        let statistics = performSoundCheck(soundCheckProcessor);
        if(statistics.normalPctPeaks > 0 || statistics.peakPctPeaks > 0.01) {
            getVolumeAlertConfig(Math.max(statistics.normalPctPeaks, statistics.peakPctPeaks));
        }
        return statistics;
    }
}

function performSoundCheck(soundCheckProcessor) {
    let statistics = {};
    soundCheckProcessor.port.onmessage = evt => Object.defineProperty(statistics, evt.data.eventType, { value: evt.data.value });
    let soundCheck = this.dialogConfigs.reduce((prev, config) =>
        prev.then(() => 
            startSoundCheckStep(soundCheckProcessor, config)
        ), 
        Promise.resolve({})
    );
    return soundCheck.then(function() {
        audioStream.getTracks().forEach(track => track.stop());
        soundCheckProcessor.port.postMessage({ eventType: "soundCheckComplete" });
        return statistics;
    });
}

function startSoundCheckStep(soundCheckProcessor, stepConfig) {
    let stepComplete = DialogService.Prompt(stepConfig);
    soundCheckProcessor.port.postMessage({ eventType: `${stepConfig.stepName}Start` });
    return stepComplete.then(() => {
        soundCheckProcessor.port.postMessage({ eventType: `${stepConfig.stepName}End` });
    });
}

function createSourceWorklet() { 
    return DeviceService.GetMediaStream()
        .then(function(stream) {
            audioStream = stream;
            inputSource = audioContext.createMediaStreamSource(stream);
        });
}

function createSoundCheckWorklet() {
    return audioContext.audioWorklet.addModule('sound-check-processor.js')
        .then(function() {
            return new AudioWorkletNode(audioContext, 'sound-check-processor', { channelCount: 1 });
        });
}

dialogConfigs = [
    {
        title: 'Room tone',
        text: 'This wizard will help you configure your sound settings. <br/>'
            + 'The first step will collect your room tone. Please be as quiet as possible for a couple of seconds and then click OK to proceed.',
        choices: [
            {
                text: 'OK',
                cssClass: 'btn btn-primary',
                reject: false,
                value: true
            },
            {
                text: 'Cancel',
                cssClass: 'btn btn-secondary',
                reject: true,
                value: false
            }
        ],
        height: 250,
        stepName: 'roomTone'
    },
    {
        title: 'Normal volume',
        text: 'This step will measure your normal volume. Speak like you normally would into your mic. Click OK when done.',
        choices: [
            {
                text: 'OK',
                cssClass: 'btn btn-primary',
                reject: false,
                value: true
            },
            {
                text: 'Cancel',
                cssClass: 'btn btn-secondary',
                reject: true,
                value: false
            }
        ],
        height:200,
        stepName: 'voiceNormal'
    },
    {
        title: 'Peak volume',
        text: 'This step will measure your peak volume. Speak loudly into your mic. Click OK when done.',
        choices: [
            {
                text: 'OK',
                cssClass: 'btn btn-primary',
                reject: false,
                value: true
            },
            {
                text: 'Cancel',
                cssClass: 'btn btn-secondary',
                reject: true,
                value: false
            }
        ],
        stepName: 'voicePeak'
    }
];

function getVolumeAlertConfig(pctPeaks) { 
    return {
        title: 'Volume too high',
        text: `Your volume is ${pctPeaks * 100 > 1 ? 'far ' : ''}too high. Your audio peaked ${pctPeaks * 100}% of the time.
            Adjust your volume, or if you can't do that, move away from your mic.
            You should restart the sound check process afterward.`,
        choices: [
            {
                text: 'OK',
                cssClass: 'btn btn-primary',
                reject: true,
                value: true
            }
        ],
        stepName: 'voicePeak'
    }
}