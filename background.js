config.defaults({
    customOps: [
        "// Add a keybinding",
        "",
        "ctrlBindings['N'] = 'neg';",
        "",
        "// If you want easy access to radix setting, uncomment these",
        "",
        "// ctrlBindings['I'] = 'iradix';",
        "// ctrlBindings['O'] = 'oradix';",
        "",
        "// Set up a more convenient alias for 'pow'",
        "",
        "ops['`'] = Math.pow;",
        "",
        "// If you would rather use ^ for pow, uncomment these",
        "",
        "// ops['\\\\'] = ops['^'];",
        "// ops['^'] = Math.pow;"
    ].join('\n')
});

chrome.extension.onRequest.addListener(function(req, src, send) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', req.url, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4)
            send(xhr);
    };
    xhr.send();
});
