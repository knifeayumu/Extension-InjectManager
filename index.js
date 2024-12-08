const renderDebounced = SillyTavern.libs.lodash.debounce(renderElement, 500);
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

/**
 * @type {InjectManagerSettings}
 * @typedef {Object} InjectManagerSettings
 * @property {boolean} enabled Whether the extension is enabled
 * @property {boolean} showIfEmpty Whether to show the element if there are no injects
 * @property {string} positionClass The position class of the element
 * @property {string} zIndexClass The z-index class of the element
 * @property {string} parentSelector The selector of the parent element
 */
const defaultSettings = Object.freeze({
    enabled: true,
    showIfEmpty: false,
    positionClass: elementPositionClasses.TOP_CENTER,
    zIndexClass: elementZIndexClasses.BELOW_PANELS,
    parentSelector: elementParentSelectors.CHAT,
});

function isSlashCommandsExecuting() {
    const formSheld = document.getElementById('form_sheld');
    if (!formSheld) {
        return false;
    }
    return formSheld.classList.contains('isExecutingCommandsFromChatInput');
}

function renderElement() {
    if (isSlashCommandsExecuting()) {
        console.debug('[Inject Manager] Slash commands are still executing, delaying render');
        return renderDebounced();
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
    injectsElement.classList.add('injectsElement', settings.positionClass, settings.zIndexClass);
    injectsElement.title = context.t`There are ${context.chatMetadata['script_injects']?.length ?? 0} injects in this chat. Click to view.`;

    const injectsCountElement = document.createElement('div');
    injectsCountElement.classList.add('injectsCount');
    injectsCountElement.classList.toggle('injectsCountEmpty', numberOfInjects === 0);
    injectsCountElement.textContent = String(numberOfInjects);

    const injectsIconElement = document.createElement('div');
    injectsIconElement.classList.add('injectsIcon', 'fa-solid', 'fa-syringe', 'fa-fw', 'fa-sm');

    injectsElement.append(injectsCountElement, injectsIconElement);
    parent.prepend(injectsElement);
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
        context.eventSource.makeLast(event, renderDebounced);
    }

    context.saveSettingsDebounced();
})();
