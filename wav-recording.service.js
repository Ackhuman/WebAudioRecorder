(function() {
    
    if (typeof(NeighborScience) === "undefined") {
        NeighborScience = {};
    }
    if (typeof(NeighborScience.Service) === "undefined") {
        NeighborScience.Service = {}; 
    }

    NeighborScience.Service.WavRecording = wavRecordingService();

    const recordingStates = {
        notStarted: 'Not Started',
        started: 'Started',
        paused: 'Paused',
        stopped: 'Stopped',
        saved: 'Saved'
    }

    function wavRecordingService() {
        return {
            Init: init,
            Start: startRecording,
            PauseOrResume: pauseOrResumeRecording,
            Stop: stopRecording,
            Download: downloadRecording,
            GetRecorderState: getRecorderState
        }
    }
    var audioContext = null;
    var inputSource = null;
    var recorderNode = null;
    var isRecordingParameter = null;
    var recordingState = null;

    const contextOptions = { 
        latencyHint: 'playback',
        sampleRate: 44100 
    };

    function init() { 
        audioContext = new AudioContext(contextOptions);
        let sourceWorkletPromise = createSourceWorklet();
        let recorderWorkletPromise = createRecorderWorklet();
        let delayNode = audioContext.createDelay(2);
        audioContext.createBufferSource();
        return Promise.all([sourceWorkletPromise, recorderWorkletPromise])
            .then(() => {
                let dest = inputSource.connect(recorderNode)
                    // .connect(delayNode)
                    // .connect(audioContext.destination);
                NeighborScience.Service.Storage.InitLossless(audioContext, 1);
            });
    }

    function createSourceWorklet() { 
        return NeighborScience.Service.Device.GetMediaStream()
            .then(function(stream) {
                inputSource = audioContext.createMediaStreamSource(stream);
            });
    }

    function createRecorderWorklet() {
        return audioContext.audioWorklet.addModule('wav-processor.js')
            .then(function() {
                recorderNode = new AudioWorkletNode(audioContext, 'wav-processor');
                isRecordingParameter = recorderNode.parameters.get('isRecording');
            });
    }

    function startRecording() {
        if (inputSource == null) {
            init().then(() => startRecording());
        } else {
            recorderNode.port.onmessage = onWavEvent;
            recorderNode.port.postMessage({ eventType: 'start' });
            triggerRecordingStateChanged(recordingState, recordingStates.started);
        }
    }

    function pauseOrResumeRecording() {
        if(recordingState === recordingStates.started){
            recorderNode.port.postMessage({ eventType: 'stop' });
            triggerRecordingStateChanged(recordingState, recordingStates.paused);
        } else { 
            recorderNode.port.postMessage({ eventType: 'start' });
            triggerRecordingStateChanged(recordingState, recordingStates.started);
        }
    }

    function stopRecording() {
        recorderNode.port.postMessage({ eventType: 'stop' });
        triggerRecordingStateChanged(recordingState, recordingStates.stopped);
    }

    function downloadRecording(userFileName) {
        NeighborScience.Service.Storage.DownloadData(userFileName);
        recorderNode.port.postMessage({ eventType: 'finish' });
        triggerRecordingStateChanged(recordingState, recordingStates.saved);
    }

    function triggerRecordingStateChanged(oldState, newState){
        let evt = new CustomEvent('recordingstatechanged', 
        {
            detail: {
                oldState: oldState,
                newState: newState
            }
        });
        window.dispatchEvent(evt);
        recordingState = newState;
    }

    function getRecorderState(){
        return recordingState;
    }


    function onWavEvent(evt) {
        switch(evt.data.eventType){
            case 'dataavailable':
                const audioData = evt.data.audioBuffer;
                NeighborScience.Service.Storage.DataAvailable(audioData);
                break;
        }
    }

})();