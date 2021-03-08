import { RecordingStates } from '../service/recordingState.service.js';

export class RecordingControls {
    _recordingService = null;
    _deviceService = null;
    elements = {
        btnPause: null,
        btnStart: null,
        btnStop: null,
        btnSoundCheck: null,
        selSources: null,
        selRecordingMethod: null,
        lblTimeDisplay: null,
        lblStatusDisplay: null
    };
    constructor(recordingService) {
        Object.getOwnPropertyNames(this.elements)
            .forEach(name => this.elements[name] = document.getElementById(name));
        this._recordingService = recordingService;
        window.addEventListener('recordingstatechanged', evt => this._onRecordingStateChanged(evt.detail.oldState, evt.detail.newState));
    }

    OnStartClicked() {
        this._recordingService.Start();        
    }

    OnPauseClicked() {
        this._recordingService.PauseOrResume();
    }

    OnStopClicked() {
        this._recordingService.Stop();
    }

    async OnSoundCheckClicked() {
        let settings = await WebSound.Controller.SoundCheck.OnSoundCheckStarted();
        return settings;
    }

    _onRecordingStateChanged(oldState, newState){
        this._setDisabledState(newState);
        this._setButtonIcon(newState);
    }

    _setButtonIcon(recorderState) {        
        let pauseIconClassList = this.elements.btnPause.querySelector('i').classList;
        switch(recorderState) {
            case RecordingStates.notStarted:
            case RecordingStates.saved:
            case RecordingStates.started:
            case RecordingStates.stopped:
                pauseIconClassList.replace('fa-play', 'fa-pause');
                break;
            case RecordingStates.paused:
                pauseIconClassList.replace('fa-pause', 'fa-play');
                break;
        }
    }

    _setDisabledState(recorderState) {
        switch(recorderState) {
            case RecordingStates.notStarted:
            case RecordingStates.saved:
                this._setButtonsDisabledState(false, true, true);
                break;
            case RecordingStates.started:
            case RecordingStates.paused:
                this._setButtonsDisabledState(true, false, false);
                break;
            case RecordingStates.stopped:
                this._setButtonsDisabledState(false, false, true);
                break;
        }
    }

    _setButtonsDisabledState(
        btnStartDisabled, 
        btnStopDisabled,
        btnPauseDisabled
    ) {
        this.elements.btnStart.disabled = btnStartDisabled;
        this.elements.btnStop.disabled = btnStopDisabled;
        this.elements.btnPause.disabled = btnPauseDisabled;
    }
}