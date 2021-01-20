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
        var overlay = createOverlay();
        elements.body.append(overlay);
        let modalContainer = createModalContainer(options);
        elements.body.append(modalContainer);

        let dialogPromise = new Promise(function(resolve, reject) {
            overlay.onclick = function(){
                closeWindow();
                reject();
            };
            let resolvers = [];
            let valueResolver = function () {
                return resolvers.reduce((result, resolver) => resolver(result), {});
            };
            if(options.valueInputs.length > 0) {
                let form = document.createElement('form');
                let inputConfigs = options.valueInputs.map(function(valueInput) {
                    return createValueInput(valueInput);
                });
                let inputs = inputConfigs.map(ic => ic.element);
                resolvers = inputConfigs.map(ic => ic.resolver);
                form.append(...inputs);
                let formContainer = document.getElementById('modalForm');
                formContainer.append(form);
            }
            let buttons = options.choices
                .map(function(choice) {
                   return createButton(choice, resolve, reject, valueResolver); 
                });
            let buttonContainer = document.getElementById('modalControls');
            buttonContainer.append(...buttons);
        });
        return dialogPromise;
    }
    //e.g.
    // {
    //  type: 'text',
    //  name: 'userFileName',
    //  placeholder: 'Enter a value',
    //  cssClass: ''
    //}
    function createValueInput(valueInput) {
        valueInput = Object.assign(createDefaultValueInput(), valueInput);
        let valueResolver = () => false;
        let input = document.createElement('input');
        input.name = valueInput.name;
        input.placeholder = valueInput.placeholder;
        let cssClasses = valueInput.cssClass.split(' ').filter(c => !!c);
        if(cssClasses.length > 0) {
            input.classList.add(...cssClasses);
        }
        switch(valueInput.type) {
            case 'text':
                input.type = 'text';
                valueResolver = result => Object.defineProperty(result, valueInput.name, { get: () => input.value });
                break;
        }

        return { element: input, resolver: valueResolver };
    }

    function createDefaultValueInput() {
        return {
            type: 'text',
            name: 'formValue',
            placeholder: 'Enter a value',
            cssClass: ''
        };
    }

    function createButton(choice, resolve, reject, valueResolver){
        let button = document.createElement("button");
        button.type = "button";
        let cssClasses = choice.cssClass.split(' ').filter(c => !!c);
        if(cssClasses.length > 0) {
            button.classList.add(...cssClasses);
        }
        button.classList.add('mx-2');
        button.innerText = choice.text;
        let onClick = function() {
            let formValue = valueResolver() || null;
            if(choice.reject) {
                reject();
            } else {
                resolve(formValue);
            }
            closeWindow();
        }
        button.onclick = onClick;
        return button;
    }

    function createOverlay() {
        let overlay = document.createElement('div');
        overlay.id = "overlay";
        overlay.classList.add('modal-bg');
        return overlay;
    }

    function createModalContainer(options) { 
        let modalContentHtml = `
            <div class="card-header">${options.title}</div>
            <div class="card-body">
                <div id="modalContent">${(options.contentHtml || options.text)}</div>
                <div id="modalForm"></div>
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
        return modalContainer;
    }
    function createDefaultOptions() {
        let options = {
            title: 'Confirm Action',
            text: 'Are you sure you want to proceed?',
            contentHtml: '',
            width: 400,
            height: 180,
            overlay: true,
            valueInputs: [],
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