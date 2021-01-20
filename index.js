(function() {

    if (typeof(NeighborScience) === "undefined") {
        NeighborScience = {};
    }
    if (typeof(NeighborScience.Controller) === "undefined") {
        NeighborScience.Controller = {}; 
    }

    NeighborScience.Controller.Main = {
        Init: init
    };

    function init() {
        insertTemplate('tplControls', 'containerControls');
        insertTemplate('tplDisplay', 'displayContainer');
        insertTemplate('tplIntroText', 'introTextContainer');
        Object.assign(NeighborScience.Controller.Main, NeighborScience.Controller.Recording);
    }
    

    function insertTemplate(templateId, containerId) {
        let controlTemplate = document.getElementById(templateId);
        let controlContainer = document.getElementById(containerId);
        controlContainer.innerHTML = controlTemplate.innerHTML;
    }

})();