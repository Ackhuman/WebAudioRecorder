export class WavProcessorStream extends ReadableStream {
    constructor(port) {
        super({
            start(controller) {
                port.onmessage = evt => {
                    switch(evt.data.eventType) {
                        case "finish":
                            controller.close();
                            break;
                        case "dataavailable":
                            controller.enqueue(evt.data.audioBuffer);
                            break;
                    }
                }
                port.onerror = err => {
                    controller.error(err);
                }
            }
        });
    }
}