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

    function init(){
        let controlTemplate = document.getElementById('tplControls');
        let controlContainer = document.getElementById('containerControls');
        controlContainer.innerHTML = controlTemplate.innerHTML;
        Object.assign(NeighborScience.Controller.Main, NeighborScience.Controller.Recording);
    }
    

})();