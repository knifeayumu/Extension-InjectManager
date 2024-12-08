const unsnake = (/** @type {string} */ str) => str ? str.toLowerCase().replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()) : '';
const renderElementDebounced = SillyTavern.libs.lodash.debounce(renderElement, 500);
const settingsKey = 'injectManager';

const elementPositionClasses = Object.freeze({
    TOP_LEFT: 'topLeft',
    TOP_CENTER: 'topCenter',
    TOP_RIGHT: 'topRight',
    BOTTOM_LEFT: 'bottomLeft',
    BOTTOM_CENTER: 'bottomCenter',
    BOTTOM_RIGHT: 'bottomRight',
});

const elementZIndexClasses = Object.freeze({
    BELOW_PANELS: 'belowPanels',
    ABOVE_PANELS: 'abovePanels',
});

const elementParentSelectors = Object.freeze({
    CHAT: '#chat',
    BODY: 'body',
});

const elementParentClasses = Object.freeze({
    [elementParentSelectors.CHAT]: 'parentChat',
    [elementParentSelectors.BODY]: 'parentBody',
});

const elementSizeClasses = Object.freeze({
    SMALL: 'small',
    NORMAL: 'normal',
    LARGE: 'large',
});

/**
 * @type {InjectManagerSettings}
 * @typedef {Object} InjectManagerSettings
 * @property {boolean} enabled Whether the extension is enabled
 * @property {boolean} showIfEmpty Whether to show the element if there are no injects
 * @property {string} positionClass The position class of the element
 * @property {string} zIndexClass The z-index class of the element
 * @property {string} sizeClass The size class of the element
 * @property {string} parentSelector The selector of the parent element
 */
const defaultSettings = Object.freeze({
    enabled: true,
    showIfEmpty: false,
    positionClass: elementPositionClasses.TOP_LEFT,
    zIndexClass: elementZIndexClasses.ABOVE_PANELS,
    sizeClass: elementSizeClasses.NORMAL,
    parentSelector: elementParentSelectors.CHAT,
});

function isSlashCommandsExecuting() {
    const formSheld = document.getElementById('form_sheld');
    if (!formSheld) {
        return false;
    }
    return formSheld.classList.contains('isExecutingCommandsFromChatInput');
}

/**
 * Render the inject manager element.
 * @param {boolean} forceRender Force render even if slash commands are executing
 * @returns {void}
 */
function renderElement(forceRender = false) {
    if (isSlashCommandsExecuting() && !forceRender) {
        console.debug('[Inject Manager] Slash commands are still executing, delaying render');
        return renderElementDebounced();
    }

    const context = SillyTavern.getContext();
    const existingElement = document.getElementById('injectManagerElement');
    if (existingElement) {
        existingElement.remove();
    }

    /** @type {InjectManagerSettings} */
    const settings = context.extensionSettings[settingsKey];

    if (!settings.enabled) {
        return;
    }

    const parent = document.querySelector(settings.parentSelector);
    const parentClass = elementParentClasses[settings.parentSelector];

    if (!parent) {
        console.error(`[Inject Manager] Parent selector "${settings.parentSelector}" not found`);
        return;
    }

    const injects = context.chatMetadata['script_injects'];
    const numberOfInjects = (injects && Object.keys(injects).length) ?? 0;

    if (!settings.showIfEmpty && numberOfInjects === 0) {
        return;
    }

    const injectsElement = document.createElement('div');
    injectsElement.id = 'injectManagerElement';
    injectsElement.classList.add('injectsElement', parentClass, settings.positionClass, settings.zIndexClass, settings.sizeClass);
    injectsElement.title = context.t`There are ${context.chatMetadata['script_injects']?.length ?? 0} injects in this chat.`;

    const injectsCountElement = document.createElement('div');
    injectsCountElement.classList.add('injectsCount');
    injectsCountElement.classList.toggle('injectsCountEmpty', numberOfInjects === 0);
    injectsCountElement.textContent = String(numberOfInjects);

    const injectsIconElement = document.createElement('div');
    injectsIconElement.classList.add('injectsIcon', 'fa-solid', 'fa-syringe', 'fa-fw', 'fa-sm');

    injectsElement.append(injectsCountElement, injectsIconElement);

    const shouldAppend = settings.positionClass.startsWith('bottom') && settings.parentSelector === elementParentSelectors.CHAT;
    shouldAppend ? parent.append(injectsElement) : parent.prepend(injectsElement);
}

function renderExtensionSettings() {

    const context = SillyTavern.getContext();
    const settingsContainer = document.getElementById('injects_container') ?? document.getElementById('extensions_settings2');
    if (!settingsContainer) {
        return;
    }

    const inlineDrawer = document.createElement('div');
    inlineDrawer.classList.add('inline-drawer');
    settingsContainer.append(inlineDrawer);

    const inlineDrawerToggle = document.createElement('div');
    inlineDrawerToggle.classList.add('inline-drawer-toggle', 'inline-drawer-header');

    const extensionName = document.createElement('b');
    extensionName.textContent = context.t`Inject Manager`;

    const inlineDrawerIcon = document.createElement('div');
    inlineDrawerIcon.classList.add('inline-drawer-icon', 'fa-solid', 'fa-circle-chevron-down', 'down');

    inlineDrawerToggle.append(extensionName, inlineDrawerIcon);

    const inlineDrawerContent = document.createElement('div');
    inlineDrawerContent.classList.add('inline-drawer-content');

    inlineDrawer.append(inlineDrawerToggle, inlineDrawerContent);

    /** @type {InjectManagerSettings} */
    const settings = context.extensionSettings[settingsKey];

    // Enabled
    const enabledCheckboxLabel = document.createElement('label');
    enabledCheckboxLabel.classList.add('checkbox_label');
    enabledCheckboxLabel.htmlFor = 'injectManagerEnabled';
    const enabledCheckbox = document.createElement('input');
    enabledCheckbox.id = 'injectManagerEnabled';
    enabledCheckbox.type = 'checkbox';
    enabledCheckbox.checked = settings.enabled;
    enabledCheckbox.addEventListener('change', () => {
        settings.enabled = enabledCheckbox.checked;
        context.saveSettingsDebounced();
        renderElement(true);
    });
    const enabledCheckboxText = document.createElement('span');
    enabledCheckboxText.textContent = context.t`Enabled`;
    enabledCheckboxLabel.append(enabledCheckbox, enabledCheckboxText);
    inlineDrawerContent.append(enabledCheckboxLabel);

    // Show if empty
    const showIfEmptyCheckboxLabel = document.createElement('label');
    showIfEmptyCheckboxLabel.classList.add('checkbox_label');
    showIfEmptyCheckboxLabel.htmlFor = 'injectManagerShowIfEmpty';
    const showIfEmptyCheckbox = document.createElement('input');
    showIfEmptyCheckbox.id = 'injectManagerShowIfEmpty';
    showIfEmptyCheckbox.type = 'checkbox';
    showIfEmptyCheckbox.checked = settings.showIfEmpty;
    showIfEmptyCheckbox.addEventListener('change', () => {
        settings.showIfEmpty = showIfEmptyCheckbox.checked;
        context.saveSettingsDebounced();
        renderElement(true);
    });
    const showIfEmptyCheckboxText = document.createElement('span');
    showIfEmptyCheckboxText.textContent = context.t`Show if empty`;
    showIfEmptyCheckboxLabel.append(showIfEmptyCheckbox, showIfEmptyCheckboxText);
    inlineDrawerContent.append(showIfEmptyCheckboxLabel);

    // Parent
    const parentSelectLabel = document.createElement('label');
    parentSelectLabel.htmlFor = 'injectManagerParent';
    parentSelectLabel.textContent = context.t`Container element`;
    const parentSelect = document.createElement('select');
    parentSelect.id = 'injectManagerParent';
    parentSelect.classList.add('text_pole');
    parentSelect.addEventListener('change', () => {
        settings.parentSelector = parentSelect.value;
        context.saveSettingsDebounced();
        renderElement(true);
    });
    for (const [key, value] of Object.entries(elementParentSelectors)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = context.translate(unsnake(key));
        parentSelect.append(option);
    }
    parentSelect.value = settings.parentSelector;
    inlineDrawerContent.append(parentSelectLabel, parentSelect);

    // Position
    const positionSelectLabel = document.createElement('label');
    positionSelectLabel.htmlFor = 'injectManagerPosition';
    positionSelectLabel.textContent = context.t`Element position`;
    const positionSelect = document.createElement('select');
    positionSelect.id = 'injectManagerPosition';
    positionSelect.classList.add('text_pole');
    positionSelect.addEventListener('change', () => {
        settings.positionClass = positionSelect.value;
        context.saveSettingsDebounced();
        renderElement(true);
    });
    for (const [key, value] of Object.entries(elementPositionClasses)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = context.translate(unsnake(key));
        positionSelect.append(option);
    }
    positionSelect.value = settings.positionClass;
    inlineDrawerContent.append(positionSelectLabel, positionSelect);

    // Size
    const sizeSelectLabel = document.createElement('label');
    sizeSelectLabel.htmlFor = 'injectManagerSize';
    sizeSelectLabel.textContent = context.t`Element size`;
    const sizeSelect = document.createElement('select');
    sizeSelect.id = 'injectManagerSize';
    sizeSelect.classList.add('text_pole');
    sizeSelect.addEventListener('change', () => {
        settings.sizeClass = sizeSelect.value;
        context.saveSettingsDebounced();
        renderElement(true);
    });
    for (const [key, value] of Object.entries(elementSizeClasses)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = context.translate(unsnake(key));
        sizeSelect.append(option);
    }
    sizeSelect.value = settings.sizeClass;
    inlineDrawerContent.append(sizeSelectLabel, sizeSelect);

    // Z-Index
    const zIndexSelectLabel = document.createElement('label');
    zIndexSelectLabel.htmlFor = 'injectManagerZIndex';
    zIndexSelectLabel.textContent = context.t`Render order`;
    const zIndexSelect = document.createElement('select');
    zIndexSelect.id = 'injectManagerZIndex';
    zIndexSelect.classList.add('text_pole');
    zIndexSelect.addEventListener('change', () => {
        settings.zIndexClass = zIndexSelect.value;
        context.saveSettingsDebounced();
        renderElement(true);
    });
    for (const [key, value] of Object.entries(elementZIndexClasses)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = context.translate(unsnake(key));
        zIndexSelect.append(option);
    }
    zIndexSelect.value = settings.zIndexClass;
    inlineDrawerContent.append(zIndexSelectLabel, zIndexSelect);
}

(function initExtension() {
    const context = SillyTavern.getContext();

    if (!context.extensionSettings[settingsKey]) {
        context.extensionSettings[settingsKey] = structuredClone(defaultSettings);
    }

    for (const key of Object.keys(defaultSettings)) {
        if (context.extensionSettings[settingsKey][key] === undefined) {
            context.extensionSettings[settingsKey][key] = defaultSettings[key];
        }
    }

    const eventsToRender = [
        context.eventTypes.APP_READY,
        context.eventTypes.CHAT_CREATED,
        context.eventTypes.CHAT_CHANGED,
        context.eventTypes.CHARACTER_MESSAGE_RENDERED,
        context.eventTypes.USER_MESSAGE_RENDERED,
        context.eventTypes.GROUP_MEMBER_DRAFTED,
        context.eventTypes.GENERATION_STARTED,
        context.eventTypes.GENERATION_AFTER_COMMANDS,
    ];

    for (const event of eventsToRender) {
        context.eventSource.makeLast(event, renderElementDebounced);
    }

    context.saveSettingsDebounced();

    renderExtensionSettings();
    renderElementDebounced();
})();
