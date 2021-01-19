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
    var analyzer = null;

    function recordingService() {
        
        return {
            GetRecorderState: getRecorderState,
            Start: start,
            Stop: stop,
            PauseOrResume: pauseOrResume,
            Download: download,
            DumpData: dumpData,
            RecordingStates: recordingStates,
            GetAnalyzer: getAnalyzer
        }
    }

    function updateRecordingState(newState){
        let oldState = recorderState;
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

    const contextOptions = { 
        latencyHint: 'playback',
        sampleRate: 44100 
    };

    function init() { 
        const audioContext = new AudioContext(contextOptions);
        return NeighborScience.Service.Device.GetMediaStream()
            .then(stream => {            
                let options = { mimeType: NeighborScience.Service.Device.GetAudioCodec() };
                inputSource = audioContext.createMediaStreamSource(stream);
                analyzer = audioContext.createAnalyser();
                inputSource.connect(analyzer);
                mediaRecorder = new MediaRecorder(stream, options);;
                NeighborScience.Service.Storage.InitLossy(recorder);
            });
    }

    function getAnalyzer() {
        return analyzer;
    }
    
    function start() {
        if(!mediaRecorder) {       
            return init().then(() => start());
        } else {
            updateRecordingState(recordingStates.started);
            mediaRecorder.start();
        }
    }

    function stop() {
        updateRecordingState(recordingStates.stopped);
        mediaRecorder.stop();
    }

    function pauseOrResume() {
        if(recorderState === recordingStates.paused) {
            updateRecordingState(recordingStates.started);
            mediaRecorder.resume();
        } else {
            updateRecordingState(recordingStates.paused);
            mediaRecorder.pause();
        }
    }

    function download(userFileName) {
        updateRecordingState(recordingStates.saved);
        NeighborScience.Service.Storage.DownloadData(userFileName);
        setTimeout(() => updateRecordingState(recordingStates.notStarted), 5000);
        return Promise.resolve(recordingStates.saved);
    }

    function dumpData() {
        NeighborScience.Service.Storage.DumpData();
        updateRecordingState(recordingStates.notStarted);
    }

    function getRecorderState() { 
        return recorderState;
    }
})();