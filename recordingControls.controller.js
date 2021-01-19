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
        OnDownloadClicked: onDownloadClicked
    }
    const elements = {
        btnPause: null,
        btnStart: null,
        btnStop: null,
        btnDownload: null,
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
            }).then(optionsHtml => document.getElementById('selSoundSource').innerHTML = optionsHtml);
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
    }

    function onPauseClicked() {
        recordingService.PauseOrResume();
    }

    function onStopClicked() {
        recordingService.Stop();
    }

    function onDownloadClicked(){
        recordingService.Download();
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
            case recordingStates.downloaded:
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
            case recordingStates.downloaded:
                setButtonsDisabledState(false, true, true, true, false);
                break;
            case recordingStates.started:
            case recordingStates.paused:
                setButtonsDisabledState(true, false, false, true, true);
                break;
            case recordingStates.stopped:
                setButtonsDisabledState(true, false, true, false, false);
                break;
        }
    }

    function setButtonsDisabledState(
        btnStartDisabled, 
        btnStopDisabled,
        btnPauseDisabled, 
        btnDownloadDisabled,
        selSoundSourceDisabled
    ) {
        btnStart.disabled = btnStartDisabled;
        btnStop.disabled = btnStopDisabled;
        btnPause.disabled = btnPauseDisabled;
        btnDownload.disabled = btnDownloadDisabled;
        selSoundSource.disabled = selSoundSourceDisabled;
    }

})();