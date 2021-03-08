export class TemplateBinderController {
    constructor(){
        document.querySelectorAll('[type="text/template"][container]')
            .forEach(node => insertTemplate(node.id, node.attributes.container.value));        
    }
}
function insertTemplate(templateId, containerId) {
    let controlTemplate = document.getElementById(templateId);
    let controlContainer = document.getElementById(containerId);
    controlContainer.innerHTML = controlTemplate.innerHTML;
}