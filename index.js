import { WavRecordingService } from './service/wavRecording.service.js';
import { RecordingControls } from './controller/recordingControls.controller.js';
import { StatusDisplayController } from './controller/statusDisplay.controller.js';
import { TemplateBinderController } from './controller/templateBinder.controller.js';

let recordingService = new WavRecordingService();
let templateBinder = new TemplateBinderController();
window.recordingController = new RecordingControls(recordingService);
window.displayController = new StatusDisplayController(recordingService);