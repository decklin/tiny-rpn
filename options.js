function init() {
    if (config.has('customOps'))
        document.getElementById('custom').value = config.get('customOps');
}

function save() {
    config.set('customOps', document.getElementById('custom').value);
}
