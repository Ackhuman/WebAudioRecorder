(function() {
    if (typeof(WebSound) === "undefined") {
        WebSound = {};
    }
    if (typeof(WebSound.Controller) === "undefined") {
        WebSound.Controller = {}; 
    }

    WebSound.Controller.StatusDisplay = {
        Init: init,
        StartCounter: startRecordedTimeDisplay,
        StopCounter: stopRecordedTimeDisplay,
        ResetCounter: resetTimeDisplay,
        UpdateRecordingState: updateRecordingState
    };

    const elements = {
        lblTimeDisplay: null,
        lblStatusDisplay: null
    };

    const recordingStates = WebSound.Service.Recording.RecordingStates;

    function init() {
        Object.getOwnPropertyNames(elements)
            .forEach(name => elements[name] = document.getElementById(name));
        window.addEventListener('recordingstatechanged', evt => updateRecordingState(evt.detail.newState));
        WebSound.Controller.Visualizer.Init();
    }

    function updateRecordingState(newState) {
        switch(newState) {
            case recordingStates.notStarted:
            case recordingStates.saved:
                resetTimeDisplay();
                WebSound.Controller.Visualizer.Reset();
                break;
            case recordingStates.stopped:
            case recordingStates.paused:
                stopRecordedTimeDisplay();
                break;
            case recordingStates.started:
                startRecordedTimeDisplay();
                WebSound.Controller.Visualizer.Start();
                break;
        }
        elements.lblStatusDisplay.innerText = newState;
    }

    var recordedTimeInterval = null;
    var recordedTimeDurationSeconds = 0;
    function startRecordedTimeDisplay() {
        if(pausedTimeInterval){
            clearInterval(pausedTimeInterval);
            pausedTimeInterval = null;
        }
        recordedTimeInterval = setInterval(function() {
            recordedTimeDurationSeconds++;
            let displayText = getRecordedTimeDisplayText();
            elements.lblTimeDisplay.innerText = displayText;
        }, 1000);
    }

    var pausedTimeInterval = null;
    function stopRecordedTimeDisplay() {
        clearInterval(recordedTimeInterval);
        recordedTimeInterval = null;
        recordedTimeDurationSeconds = 0;
        if(!pausedTimeInterval){
            pausedTimeInterval = setInterval(function() {
                elements.lblTimeDisplay.classList.toggle('blink');
            }, 1000);
        }
    }

    function getRecordedTimeDisplayText() {        
        let recordedTimeHours = Math.floor(recordedTimeDurationSeconds / (60 * 60));
        let recordedTimeMinutes = Math.floor((recordedTimeDurationSeconds - (recordedTimeHours * 60 * 60)) / 60);
        let recordedTimeSeconds = recordedTimeDurationSeconds - (recordedTimeHours * 60 * 60) - (recordedTimeMinutes * 60);
        return `${padLeft("00", recordedTimeHours)}:${padLeft("00", recordedTimeMinutes)}:${padLeft("00", recordedTimeSeconds)}`;
    }

    function resetTimeDisplay() {        
        clearInterval(pausedTimeInterval);
        clearInterval(recordedTimeInterval);
        elements.lblTimeDisplay.innerText = "00:00:00";
        elements.lblTimeDisplay.classList.remove('blink');
    }

    function padLeft(format, str) {
        if(typeof(str) === "number"){
            str = str.toString();
        }
        return format.substring(0, format.length - str.length) + str
    }

})();