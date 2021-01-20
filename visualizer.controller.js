(function() {
    
    if (typeof(NeighborScience) === "undefined") {
        NeighborScience = {};
    }
    if (typeof(NeighborScience.Controller) === "undefined") {
        NeighborScience.Controller = {}; 
    }

    NeighborScience.Controller.Visualizer = {
        Init: init,
        Start: start,
        Reset: reset
    };

    const elements = {
        visualizer: null
    }
    var canvasCtx = null;
    var analyzer = null;
    
    var canvasWidth = 0;
    var canvasHeight = 0;
    var fillColor = 'rgb(0, 0, 0)';
    var drawColor = 'rgb(255, 255, 255)';
    var drawVisual = null;

    function init() { 
        Object.getOwnPropertyNames(elements)
            .forEach(name => elements[name] = document.getElementById(name));
        canvasCtx = elements.visualizer.getContext("2d");
    }

    function start() {
        let recordingMethod = NeighborScience.Service.Device.GetRecordingMethod();
        //set the correct recording service
        let useWavRecording = recordingMethod == "lossless";
        recordingService = useWavRecording 
            ? NeighborScience.Service.WavRecording
            : NeighborScience.Service.Recording;
        analyzer = recordingService.GetAnalyzer();
        visualize();
    }

    function reset() {
        canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        canvasCtx.fillStyle = fillColor;
        canvasCtx.fillRect(0, 0, canvasWidth, canvasHeight);
        cancelAnimationFrame(drawVisual);
    }

    function visualize() {
        canvasWidth = elements.visualizer.width;
        canvasHeight = elements.visualizer.height;

        fillColor = 'rgb(51, 51, 51)';
        drawColor = 'rgb(68, 255, 68)';

        var visualSetting = "bars"//visualSelect.value;

        if (visualSetting === "sinewave") {
            drawSineWave();
        } else if (visualSetting == "bars") {
            drawBars();
        } else if (visualSetting == "off") {
            canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);
            canvasCtx.fillStyle = "red";
            canvasCtx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
    
    }

    function drawBars() {
        analyzer.fftSize = 256;
        var bufferLengthAlt = analyzer.frequencyBinCount;
        var dataArrayAlt = new Uint8Array(bufferLengthAlt);

        canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);

        var drawBar = function() {
            drawVisual = requestAnimationFrame(drawBar);

            analyzer.getByteFrequencyData(dataArrayAlt);

            canvasCtx.fillStyle = fillColor;
            canvasCtx.fillRect(0, 0, canvasWidth, canvasHeight);

            var barWidth = (canvasWidth / bufferLengthAlt) * 2.5;
            var barHeight;
            var x = 0;

            for(var i = 0; i < bufferLengthAlt; i++) {
                barHeight = dataArrayAlt[i];

                canvasCtx.fillStyle = drawColor
                canvasCtx.fillRect(x,canvasHeight-barHeight/2,barWidth,barHeight/2);

                x += barWidth + 1;
            }
        };

        drawBar();
    }

    function drawSineWave() {
        analyzer.fftSize = 2048;
        var bufferLength = analyzer.fftSize;
        console.log(bufferLength);
        var dataArray = new Uint8Array(bufferLength);

        canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);

        var drawWave = function() {
            drawVisual = requestAnimationFrame(drawWave);
            analyzer.getByteTimeDomainData(dataArray);

            canvasCtx.fillStyle = fillColor
            canvasCtx.fillRect(0, 0, canvasWidth, canvasHeight);

            canvasCtx.lineWidth = 2;
            canvasCtx.strokeStyle = drawColor;

            canvasCtx.beginPath();

            var sliceWidth = canvasWidth * 1.0 / bufferLength;
            var x = 0;

            for(var i = 0; i < bufferLength; i++) {

                var v = dataArray[i] / 128.0;
                var y = v * canvasHeight/2;

                if(i === 0) {
                    canvasCtx.moveTo(x, y);
                } else {
                    canvasCtx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            canvasCtx.lineTo(canvasWidth, canvasHeight / 2);
            canvasCtx.stroke();
        };

        drawWave();
    }

})();