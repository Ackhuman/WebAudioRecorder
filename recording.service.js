(function() {
    
    if (typeof(WebSound) === "undefined") {
        WebSound = {};
    }
    if (typeof(WebSound.Service) === "undefined") {
        WebSound.Service = {}; 
    }

    const recordingStates = {
        notStarted: 'Not Started',
        started: 'Started',
        paused: 'Paused',
        stopped: 'Stopped',
        saved: 'Saved'
    }

    WebSound.Service.Recording = recordingService();

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
        return WebSound.Service.Device.GetMediaStream()
            .then(stream => {            
                let options = { mimeType: WebSound.Service.Device.GetAudioCodec() };
                inputSource = audioContext.createMediaStreamSource(stream);
                analyzer = audioContext.createAnalyser();
                inputSource.connect(analyzer);
                mediaRecorder = new MediaRecorder(stream, options);;
                WebSound.Service.Storage.InitLossy(recorder);
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
        WebSound.Service.Storage.DownloadData(userFileName);
        setTimeout(() => updateRecordingState(recordingStates.notStarted), 5000);
        return Promise.resolve(recordingStates.saved);
    }

    function dumpData() {
        WebSound.Service.Storage.DumpData();
        updateRecordingState(recordingStates.notStarted);
    }

    function getRecorderState() { 
        return recorderState;
    }
})();