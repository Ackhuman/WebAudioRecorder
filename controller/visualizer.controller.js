export class Visualizer {
    _canvasCtx = null;
    _analyzer = null;
    _paused = false;
    _canvasWidth = 0;
    _canvasHeight = 0;
    _fillColor = 'rgb(0, 0, 0)';
    _drawColor = 'rgb(255, 255, 255)';
    _drawVisual = null;

    _recordingService = null;
    constructor(recordingService, elements) {
        this.elements = elements;
        this._canvasCtx = this.elements.visualizer.getContext("2d");
        //todo: singleton service
        this._recordingService = recordingService;
    }

    async Start() {
        if(!this._analyzer){
            this._analyzer = await this._recordingService.GetAnalyzer();
        }
        this._visualize();
        this._paused = false;
    }

    PauseOrResume() {
        cancelAnimationFrame(this._drawVisual);
        this._paused = true;
    }

    Reset() {
        this._canvasCtx.clearRect(0, 0, this._canvasWidth, this._canvasHeight);
        this._canvasCtx.fillStyle = this._fillColor;
        this._canvasCtx.fillRect(0, 0, this._canvasWidth, this._canvasHeight);
        cancelAnimationFrame(this._drawVisual);
    }

    _visualize() {
        this._canvasWidth = this.elements.visualizer.width;
        this._canvasHeight = this.elements.visualizer.height;

        this._fillColor = 'rgb(51, 51, 51)';
        this._drawColor = 'rgb(68, 255, 68)';

        var visualSetting = "bars"//visualSelect.value;

        if (visualSetting === "sinewave") {
            this._drawSineWave();
        } else if (visualSetting == "bars") {
            this._drawBars();
        } else if (visualSetting == "off") {
            this._canvasCtx.clearRect(0, 0, this._canvasWidth, this._canvasHeight);
            this._canvasCtx.fillStyle = "red";
            this._canvasCtx.fillRect(0, 0, this._canvasWidth, this._canvasHeight);
        }
    
    }
    _dataArrayAlt = null;
    _drawBars() {
        this._analyzer.fftSize = 256;
        this._bufferLengthAlt = this._analyzer.frequencyBinCount
        this._dataArrayAlt = new Uint8Array(this._bufferLengthAlt);
        this._canvasCtx.clearRect(0, 0, this._canvasWidth, this._canvasHeight);
        this._drawBar();
    }

    _drawBar() {
        this._drawVisual = requestAnimationFrame(this._drawBar.bind(this));

        this._analyzer.getByteFrequencyData(this._dataArrayAlt);

        this._canvasCtx.fillStyle = this._fillColor;
        this._canvasCtx.fillRect(0, 0, this._canvasWidth, this._canvasHeight);

        var barWidth = (this._canvasWidth / this._bufferLengthAlt) * 2.5;
        var barHeight;
        var x = 0;

        for(var i = 0; i < this._bufferLengthAlt; i++) {
            barHeight = this._dataArrayAlt[i];

            this._canvasCtx.fillStyle = this._drawColor
            this._canvasCtx.fillRect(
                x, 
                this._canvasHeight-barHeight * 0.5, 
                barWidth, 
                barHeight * 0.5
            );

            x += barWidth + 1;
        }
    }

    _drawSineWave() {
        this._analyzer.fftSize = 2048;
        var bufferLength = this._analyzer.fftSize;
        console.log(bufferLength);
        var dataArray = new Uint8Array(bufferLength);

        this._canvasCtx.clearRect(0, 0, this._canvasWidth, this._canvasHeight);

        var drawWave = function() {
            this._drawVisual = requestAnimationFrame(drawWave);
            this._analyzer.getByteTimeDomainData(dataArray);

            this._canvasCtx.fillStyle = fillColor
            this._canvasCtx.fillRect(0, 0, this._canvasWidth, this._canvasHeight);

            this._canvasCtx.lineWidth = 2;
            this._canvasCtx.strokeStyle = drawColor;

            this._canvasCtx.beginPath();

            var sliceWidth = this._canvasWidth * 1.0 / bufferLength;
            var x = 0;

            for(var i = 0; i < bufferLength; i++) {

                var v = dataArray[i] / 128.0;
                var y = v * this._canvasHeight/2;

                if(i === 0) {
                    this._canvasCtx.moveTo(x, y);
                } else {
                    this._canvasCtx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            this._canvasCtx.lineTo(this._canvasWidth, this._canvasHeight / 2);
            this._canvasCtx.stroke();
        };

        drawWave();
    }
}