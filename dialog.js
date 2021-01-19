(function() {
    if (typeof(NeighborScience) === "undefined") {
        NeighborScience = {};
    }
    NeighborScience.Dialog = {
        Init: init,
        Prompt: prompt
    }; 

    const elements = {
        body: null
    };

    function init() {
        elements.body = document.querySelector('body');
    }

    function prompt(userOptions) {
        let dialogOptions = Object.assign(
            createDefaultOptions(), 
            userOptions
        );
        return createWindow(dialogOptions);        
    }
    
    function closeWindow() {
        document.getElementById('modal').remove();
        document.getElementById('overlay').remove();
    }

    function createWindow(options) {
        let overlay = document.createElement('div');
        overlay.id = "overlay";
        overlay.classList.add('modal-bg');
        elements.body.append(overlay);

        let modalContentHtml = `
            <div class="card-header">${options.title}</div>
            <div class="card-body">
                <div id="modalContent">${(options.contentHtml || options.text)}</div>
                <div id="modalControls" class="my-2"></span>
            </div>
            
        `;

        let modalContainer = document.createElement('div');
        modalContainer.id = "modal";
        modalContainer.classList.add('modal', 'card');
        modalContainer.innerHTML = modalContentHtml;
        modalContainer.style.height = `${options.height}px`;
        modalContainer.style.width = `${options.width}px`;
        modalContainer.style.display = 'block';
        elements.body.append(modalContainer);

        let dialogPromise = new Promise(function(resolve, reject) {
            overlay.onclick = function(){
                closeWindow();
                reject();
            };
            let buttons = options.choices
                .map(function(choice) {
                    let button = document.createElement("button");
                    button.type = "button";
                    let cssClasses = choice.cssClass.split(' ');
                    button.classList.add(...cssClasses);
                    button.classList.add('mx-2');
                    button.innerText = choice.text;
                    let onClick = function() {
                        if(choice.reject) {
                            reject();
                        } else {
                            resolve();
                        }
                        closeWindow();
                    }
                    button.onclick = onClick;
                    return button;
                });
            
                document.getElementById('modalControls').append(...buttons);
            });
        return dialogPromise;
    }
    function createDefaultOptions() {
        let options = {
            title: 'Confirm Action',
            text: 'Are you sure you want to proceed?',
            contentHtml: '',
            width: 400,
            height: 180,
            overlay: true,
            choices: [
                {
                    text: 'Yes',
                    cssClass: 'btn btn-primary',
                    reject: false
                },
                {
                    text: 'Cancel',
                    cssClass: 'btn btn-danger',
                    reject: true
                }
            ]
        };
        return options;
    }
})();