(function() {

    if (typeof(WebSound) === "undefined") {
        WebSound = {};
    }
    if (typeof(WebSound.Controller) === "undefined") {
        WebSound.Controller = {}; 
    }

    WebSound.Controller.Main = {
        Init: init
    };

    function init() {
        insertTemplate('tplControls', 'containerControls');
        insertTemplate('tplDisplay', 'displayContainer');
        insertTemplate('tplIntroText', 'introTextContainer');
        Object.assign(WebSound.Controller.Main, WebSound.Controller.Recording);
    }
    

    function insertTemplate(templateId, containerId) {
        let controlTemplate = document.getElementById(templateId);
        let controlContainer = document.getElementById(containerId);
        controlContainer.innerHTML = controlTemplate.innerHTML;
    }

})();