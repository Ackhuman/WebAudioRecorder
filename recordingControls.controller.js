(function() {
    if (typeof(WebSound) === "undefined") {
        WebSound = {};
    }
    if (typeof(WebSound.Controller) === "undefined") {
        WebSound.Controller = {}; 
    }

    WebSound.Controller.RecordingControls = {
        Init: init,
        OnStartClicked: onStartClicked,
        OnPauseClicked: onPauseClicked,
        OnStopClicked: onStopClicked
    }
    const elements = {
        btnPause: null,
        btnStart: null,
        btnStop: null,
        selSources: null,
        selRecordingMethod: null,
        lblTimeDisplay: null
    };
    const recordingStates = WebSound.Service.Recording.RecordingStates;
    var recordingService = null;

    function init() {
        Object.getOwnPropertyNames(elements)
            .forEach(name => elements[name] = document.getElementById(name));
        initSoundSourceSelector();
        window.addEventListener('recordingstatechanged', evt => onRecordingStateChanged(evt.detail.oldState, evt.detail.newState));
    }

    function initSoundSourceSelector() {        
        WebSound.Service.Device.GetAvailableDevices()
            .then(devices => {
                let audioDevices = devices.filter(device => device.kind === "audioinput");
                if(audioDevices.length > 1) {
                    createDeviceOptionHtml(audioDevices);
                } else {
                    document.getElementById('selSoundSource').style.display = 'none';
                }
            });
    }

    function onStartClicked() {
        let saveOrDumpDialogConfig = {
            title: 'Dump current audio?',
            text: 'Do you want to add to the current recording, or dump the recording and start a fresh one?',
            choices: [
                {
                    text: 'Add',
                    cssClass: 'btn btn-primary',
                    reject: false,
                    value: true
                },
                {
                    text: 'Dump',
                    cssClass: 'btn btn-danger',
                    reject: false,
                    value: false
                }
            ]
        };
        let proceedPromise = WebSound.Service.Storage.HasAudio()
            ? WebSound.Dialog.Prompt(saveOrDumpDialogConfig)
            : Promise.resolve(false);
        proceedPromise
            .then(function(dump) { 
                if(dump) {
                    WebSound.Service.Storage.DumpData();
                }
                let recordingMethod = WebSound.Service.Device.GetRecordingMethod();
                //set the correct recording service
                let useWavRecording = recordingMethod == "lossless";
                WebSound.Service.Device.SetRecordingMethod(recordingMethod);
                recordingService = useWavRecording 
                    ? WebSound.Service.WavRecording
                    : WebSound.Service.Recording;
                recordingService.Start();
            });
        
    }

    function onPauseClicked() {
        recordingService.PauseOrResume();
    }

    function onStopClicked() {
        recordingService.Stop();
    }

    function onDownloadClicked() {
        // let fileNameDialogConfig = {
        //     title: 'Save Audio',
        //     height: 240,
        //     text: 'If you want, enter a name for the file. The best practice would be to use your name and some description of what you\'re talking about.',
        //     valueInputs: [
        //         {
        //             type: 'text',
        //             placeholder: 'Enter a file name (optional)',
        //             name: 'fileName'
        //         }
        //     ],
        //     choices: [
        //         {
        //             text: 'Save',
        //             cssClass: 'btn btn-primary',
        //             reject: false
        //         }
        //     ]
        // };
        recordingService.Download(fileName);
    }

    function createDeviceOptionHtml(devices) {
        return devices.map(device => `<option value="${device.deviceId}">${device.label}</option>`);
    }

    function onRecordingStateChanged(oldState, newState){
        setDisabledState(newState);
        setButtonIcon(newState);
    }

    function setButtonIcon(recorderState) {        
        let pauseIconClassList = btnPause.querySelector('i').classList;
        switch(recorderState) {
            case recordingStates.notStarted:
            case recordingStates.saved:
            case recordingStates.started:
            case recordingStates.stopped:
                pauseIconClassList.replace('fa-play', 'fa-pause');
                break;
            case recordingStates.paused:
                pauseIconClassList.replace('fa-pause', 'fa-play');
                break;
        }
    }

    function setDisabledState(recorderState) {
        switch(recorderState) {
            case recordingStates.notStarted:
            case recordingStates.saved:
                setButtonsDisabledState(false, true, true, true, true, false);
                break;
            case recordingStates.started:
            case recordingStates.paused:
                setButtonsDisabledState(true, false, false, true, true, true);
                break;
            case recordingStates.stopped:
                setButtonsDisabledState(false, false, true, false, false, false);
                break;
        }
    }

    function setButtonsDisabledState(
        btnStartDisabled, 
        btnStopDisabled,
        btnPauseDisabled, 
        btnDownloadDisabled,
        btnDumpDisabled,
        selSoundSourceDisabled
    ) {
        elements.btnStart.disabled = btnStartDisabled;
        elements.btnStop.disabled = btnStopDisabled;
        elements.btnPause.disabled = btnPauseDisabled;
        // elements.btnDownload.disabled = btnDownloadDisabled;
        // elements.btnDump.disabled = btnDumpDisabled;
        //selSoundSource.disabled = selSoundSourceDisabled;
    }

})();