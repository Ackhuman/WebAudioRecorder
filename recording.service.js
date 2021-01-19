(function() {
    
    if (typeof(NeighborScience) === "undefined") {
        NeighborScience = {};
    }
    if (typeof(NeighborScience.Service) === "undefined") {
        NeighborScience.Service = {}; 
    }

    const recordingStates = {
        notStarted: 'Not Started',
        started: 'Started',
        paused: 'Paused',
        stopped: 'Stopped',
        saved: 'Saved'
    }

    NeighborScience.Service.Recording = recordingService();

    var recorderState = recordingStates.notStarted;
    var mediaRecorder = null;

    function recordingService() {
        
        return {
            GetRecorderState: getRecorderState,
            Start: start,
            Stop: stop,
            PauseOrResume: pauseOrResume,
            Download: download,
            RecordingStates: recordingStates
        }
    }

    function triggerRecordingStateChanged(oldState, newState){
        let evt = new CustomEvent('recordingstatechanged', 
        {
            detail:{
                oldState: oldState,
                newState: newState
            }
        });
        window.dispatchEvent(evt);
        recorderState = newState;
    }

    function init() { 
        return NeighborScience.Service.Device.GetMediaRecorder()
            .then(recorder => {
                mediaRecorder = recorder;
                NeighborScience.Service.Storage.InitLossy(recorder);
            });
    }

    function start() {
        if(!mediaRecorder) {       
            return init().then(() => start());
        } else {
            triggerRecordingStateChanged(recorderState, recordingStates.started);
            mediaRecorder.start();
        }
    }

    function stop() {
        triggerRecordingStateChanged(recorderState, recordingStates.stopped);
        mediaRecorder.stop();
    }

    function pauseOrResume() {
        if(recorderState === recordingStates.paused) {
            triggerRecordingStateChanged(recorderState, recordingStates.started);
            mediaRecorder.resume();
        } else {
            triggerRecordingStateChanged(recorderState, recordingStates.paused);
            mediaRecorder.pause();
        }
    }

    function download(userFileName) {
        triggerRecordingStateChanged(recorderState, recordingStates.saved);
        NeighborScience.Service.Storage.DownloadData(userFileName);
        return Promise.resolve(recordingStates.saved);
    }

    function getRecorderState() { 
        return recorderState;
    }
})();