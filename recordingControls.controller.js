(function() {
    if (typeof(NeighborScience) === "undefined") {
        NeighborScience = {};
    }
    if (typeof(NeighborScience.Controller) === "undefined") {
        NeighborScience.Controller = {}; 
    }

    NeighborScience.Controller.RecordingControls = {
        Init: init,
        OnStartClicked: onStartClicked,
        OnPauseClicked: onPauseClicked,
        OnStopClicked: onStopClicked,
        OnDownloadClicked: onDownloadClicked,
        OnDumpClicked: onDumpClicked
    }
    const elements = {
        btnPause: null,
        btnStart: null,
        btnStop: null,
        btnDownload: null,
        btnDump: null,
        selSources: null,
        selRecordingMethod: null,
        lblTimeDisplay: null
    };
    const recordingStates = NeighborScience.Service.Recording.RecordingStates;
    var recordingService = null;

    function init() {
        Object.getOwnPropertyNames(elements)
            .forEach(name => elements[name] = document.getElementById(name));
        initSoundSourceSelector();
        window.addEventListener('recordingstatechanged', evt => onRecordingStateChanged(evt.detail.oldState, evt.detail.newState));
        NeighborScience.Controller.Visualizer.Init();
    }

    function initSoundSourceSelector() {        
        NeighborScience.Service.Device.GetAvailableDevices()
            .then(devices => {
                let audioDevices = devices.filter(device => device.kind === "audioinput");
                if(audioDevices.length > 1) {
                    createDeviceOptionHtml(audioDevices);
                } else {
                    document.getElementById('selSoundSource').style.display = 'none';
                }
            }).then(optionsHtml => void 0
                //document.getElementById('selSoundSource').innerHTML = optionsHtml
            );
    }

    function onStartClicked() {
        let recordingMethod = elements.selRecordingMethod
            .options[elements.selRecordingMethod.selectedIndex].value;
        //set the correct recording service
        let useWavRecording = recordingMethod == "lossless";
        NeighborScience.Service.Device.SetRecordingMethod(recordingMethod);
        recordingService = useWavRecording 
            ? NeighborScience.Service.WavRecording
            : NeighborScience.Service.Recording;
        recordingService.Start();
        let analyzer = recordingService.GetAnalyzer();
        NeighborScience.Controller.Visualizer.Start(analyzer);
    }

    function onPauseClicked() {
        recordingService.PauseOrResume();
    }

    function onStopClicked() {
        recordingService.Stop();
        NeighborScience.Controller.Visualizer.Reset();
    }

    function onDownloadClicked() {
        let fileNameDialogConfig = {
            title: 'Save Audio',
            height: 240,
            text: 'If you want, enter a name for the file. The best practice would be to use your name and some description of what you\'re talking about.',
            valueInputs: [
                {
                    type: 'text',
                    placeholder: 'Enter a file name (optional)',
                    name: 'fileName'
                }
            ],
            choices: [
                {
                    text: 'Save',
                    cssClass: 'btn btn-primary',
                    reject: false
                }
            ]
        };
        NeighborScience.Dialog.Prompt(fileNameDialogConfig)
            .then(({fileName}) => 
                recordingService.Download(fileName)
            );
    }

    function onDumpClicked() {
        NeighborScience.Dialog.Prompt({
            text: 'This will delete all of the audio you\'ve recorded. This cannot be undone.'
        }).then(() => {
            recordingService.DumpData();
        }, () => {});        
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
        elements.btnDownload.disabled = btnDownloadDisabled;
        elements.btnDump.disabled = btnDumpDisabled;
        //selSoundSource.disabled = selSoundSourceDisabled;
    }

})();