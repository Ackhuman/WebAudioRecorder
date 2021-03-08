import { RecordingStates } from './wavRecording.service.js';
import { DeviceService } from './device.service.js';

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
            case RecordingStates.notStarted.title:
            case RecordingStates.saved.title:
            case RecordingStates.started.title:
            case RecordingStates.stopped.title:
                pauseIconClassList.replace('fa-play', 'fa-pause');
                break;
            case RecordingStates.paused.title:
                pauseIconClassList.replace('fa-pause', 'fa-play');
                break;
        }
    }

    _setDisabledState(recorderState) {
        switch(recorderState) {
            case RecordingStates.notStarted.title:
            case RecordingStates.saved.title:
                this._setButtonsDisabledState(false, true, true);
                break;
            case RecordingStates.started.title:
            case RecordingStates.paused.title:
                this._setButtonsDisabledState(true, false, false);
                break;
            case RecordingStates.stopped.title:
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