
export class RecordingStates {
    static notStarted = {
        title: 'Not Started',
        message: null
    }
    static started = {
        title: 'Started',
        message: 'start'
    }
    static paused = {
        title: 'Paused',
        message: 'stop'
    }
    static stopped = {
        title: 'Stopped',
        message: 'stop'
    }
    static saved = {
        title: 'Saved',
        message: 'finish'
    }
}

export class RecordingStateService {
    _recordingState = RecordingStates.notStarted;
    _ports = [];

    addPort(port) {
        this._ports.push(port);
    }

    start() {
        this._updateRecordingState(RecordingStates.started);
    }

    pauseOrResume() {
        let newState = this._recordingState === RecordingStates.started
            ? RecordingStates.paused
            : RecordingStates.started;
        this._updateRecordingState(newState);
    }

    stop() {
        this._updateRecordingState(RecordingStates.stopped);
        //since we're streaming the file, just finish it immediately
        this._updateRecordingState(RecordingStates.saved);
    }

    _updateRecordingState(newState) {
        let oldState = this._recordingState;
        let evt = new CustomEvent('recordingstatechanged', 
        {
            detail: {
                oldState: oldState,
                newState: newState
            }
        });
        window.dispatchEvent(evt);
        this._recordingState = newState;
        this._ports.forEach(port => port.postMessage({ eventType: newState.message }));
    }
}