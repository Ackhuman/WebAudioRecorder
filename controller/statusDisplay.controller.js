import { Visualizer } from './visualizer.controller.js';
import { RecordingStates } from '../service/recordingState.service.js';

export class StatusDisplayController {
    elements = {
        lblTimeDisplay: null,
        lblStatusDisplay: null,
        visualizer: null
    };
    _visualizer = null;
    _recordedTimeInterval = null;
    _recordedTimeDurationSeconds = 0;
    _pausedTimeInterval = null;

    constructor(recordingService) {
        Object.getOwnPropertyNames(this.elements)
            .forEach(name => this.elements[name] = document.getElementById(name));
        window.addEventListener('recordingstatechanged', evt => this.updateRecordingState(evt.detail.newState));
        this._visualizer = new Visualizer(recordingService, this.elements);
    }

    updateRecordingState(newState) {
        switch(newState) {
            case RecordingStates.notStarted:
            case RecordingStates.saved:
                this.resetTimeDisplay();
                this._visualizer.Reset();
                break;
            case RecordingStates.stopped:
            case RecordingStates.paused:
                this.stopRecordedTimeDisplay();
                this._visualizer.PauseOrResume();
                break;
            case RecordingStates.started:
                this.startRecordedTimeDisplay();
                this._visualizer.Start();
                break;
        }
        this.elements.lblStatusDisplay.innerText = newState.title;
    }

    startRecordedTimeDisplay() {
        if(this._pausedTimeInterval){
            clearInterval(this._pausedTimeInterval);
            this._pausedTimeInterval = null;
        }
        this._recordedTimeInterval = setInterval(() => this._updateTimeDisplay(), 1000);
    }

    _updateTimeDisplay() {
        this._recordedTimeDurationSeconds++;
        let displayText = this._getRecordedTimeDisplayText();
        this.elements.lblTimeDisplay.innerText = displayText;
    }

    stopRecordedTimeDisplay() {
        clearInterval(this._recordedTimeInterval);
        this._recordedTimeInterval = null;
        this._recordedTimeDurationSeconds = 0;
        if(!this._pausedTimeInterval){
            this._pausedTimeInterval = setInterval(() => this.elements.lblTimeDisplay.classList.toggle('blink'), 1000);
        }
    }

    _getRecordedTimeDisplayText() {        
        let recordedTimeHours = Math.floor(this._recordedTimeDurationSeconds / (60 * 60));
        let recordedTimeMinutes = Math.floor((this._recordedTimeDurationSeconds - (recordedTimeHours * 60 * 60)) / 60);
        let recordedTimeSeconds = this._recordedTimeDurationSeconds - (recordedTimeHours * 60 * 60) - (recordedTimeMinutes * 60);
        return `${padLeft("00", recordedTimeHours)}:${padLeft("00", recordedTimeMinutes)}:${padLeft("00", recordedTimeSeconds)}`;
    }

    resetTimeDisplay() {        
        clearInterval(this._pausedTimeInterval);
        clearInterval(this._recordedTimeInterval);
        this.elements.lblTimeDisplay.innerText = "00:00:00";
        this.elements.lblTimeDisplay.classList.remove('blink');
    }

}
function padLeft(format, str) {
    if(typeof(str) === "number"){
        str = str.toString();
    }
    return format.substring(0, format.length - str.length) + str
}