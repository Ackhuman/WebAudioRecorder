import { WavRecordingService } from './wavRecording.service.js';
import { RecordingControls } from './recordingControls.controller.js';
import { StatusDisplayController } from './statusDisplay.controller.js';
import { TemplateBinderController } from './templateBinder.controller.js';

let recordingService = new WavRecordingService();
let templateBinder = new TemplateBinderController();
window.recordingController = new RecordingControls(recordingService);
window.displayController = new StatusDisplayController(recordingService);