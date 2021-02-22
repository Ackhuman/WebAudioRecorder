(function() {
    if (typeof(WebSound) === "undefined") {
        WebSound = {};
    }
    if (typeof(WebSound.Controller) === "undefined") {
        WebSound.Controller = {}; 
    }

    WebSound.Controller.SoundCheck = {
        OnSoundCheckStarted: onSoundCheckStarted
    }
    var audioContext = null;
    var inputSource = null;
    
    function onSoundCheckStarted() {
        audioContext = new AudioContext(contextOptions);
        let sourceWorkletPromise = createSourceWorklet();
        let soundCheckWorkletPromise = createSoundCheckWorklet();
        audioContext.createBufferSource();
        return Promise.all([sourceWorkletPromise, soundCheckWorkletPromise])
            .then(([src, soundCheckProcessor]) => {
                inputSource.connect(soundCheckProcessor);
                return performSoundCheck(soundCheckProcessor);
            });
    }

    function performSoundCheck(soundCheckProcessor) {
        let soundCheck = this.dialogConfigs.reduce(async function(settings, config) {
            let result = await startSoundCheckStep(soundCheckProcessor, config);
            return Object.defineProperty(settings, result.eventType, { value: result.value });
        }, {});
        return soundCheck.then(function(settings) {
            audioStream.getTracks().forEach(track => track.stop());
            soundCheckProcessor.port.postMessage({ eventType: "soundCheckComplete" });
            return settings;
        });
    }

    function startSoundCheckStep(soundCheckProcessor, stepConfig) {
        let stepComplete = WebSound.Dialog.Prompt(stepConfig);
        soundCheckProcessor.port.postMessage({ eventType: `${stepConfig.stepName}Start` });
        stepComplete.then(() => {
            soundCheckProcessor.port.postMessage({ eventType: `${stepConfig.stepName}End` });
        });
        return new Promise(resolve => {
            soundCheckProcessor.port.onMessage = function() {
                resolve(evt.data);
            };
        });
    }

    function createSourceWorklet() { 
        return WebSound.Service.Device.GetMediaStream()
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
})();