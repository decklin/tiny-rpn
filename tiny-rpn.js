// Table of operations. The machinery below will pop however many
// arguments the function takes, and apply them in to it in "normal"
// order (i.e. reverse order of being popped). If the function returns
// a value (or values), it (or they) will be pushed back.

var ops = {
// Arithmetic
    '+': function(a, b) { return a + b; },
    '-': function(a, b) { return a - b; },
    '*': function(a, b) { return a * b; },
    '+': function(a, b) { return a + b; },
    '/': function(a, b) { return a / b; },
    '%': function(a, b) { return a % b; },
    '~': function(a) { return -a; },
    '^': Math.pow,
// Bits
    '&': function(a, b) { return a & b; },
    '|': function(a, b) { return a | b; },
    '\\': function(a, b) { return a ^ b; }, // now I'm just making shit up
// Logical
    'or': function(a, b) { return a || b; },
    'and': function(a, b) { return a && b; },
    'not': function(a) { return !a; },
// Stack
    'swap': function(a, b) { return [b, a]; },
    'pop': function(a) { setEntry(a); return null; },
    'drop': function(a) { return null; },
    'drop2': function(a,b) { return null; },
    'dup': function(a) { return [a, a]; },
    'dup2': function(a) { return [a, a, a]; },
    'clear': function() { this.splice(0, this.length); return null; },
// Meta
    'noop': function() { return null; }
};

// Fill in some simple stuff using the builtin Math object. For some reason,
// we can't enumerate it, so here's a list of the interesting attributes.

var mathConsts = ['E','LN2','LN10','LOG2E','LOG10E','PI','SQRT1_2','SQRT2'];
var mathFuncs = ['abs','acos','asin','atan','atan2','ceil','cos','exp','floor',
                 'log','max','min','pow','random','round','sin','sqrt','tan'];

mathConsts.forEach(function(a) { ops[a] = function() { return Math[a]; }; });
mathFuncs.forEach(function(a) { ops[a] = Math[a]; });

// Aliases... not really sure about any of this. Need to consult an old hat.

ops[';'] = ops['swap'];

// The stack. Nothing more than an array with an entry point for evaluating
// ops, which returns the value that should be placed back in the entry box
// (i.e. a number if the command was "pop", blank otherwise).

var stack = [];

stack.dispatch = function(op) {
    if (op) var f = ops[op];
    else return;

    if (!f) {
        setError('unknown command: ' + op);
    } else if (f.length > this.length) {
        setError('not enough numbers on stack');
    } else {
        try {
            var args = this.splice(this.length - f.length, f.length);
            var result = f.apply(this, args);
            if (result != undefined) {
                if (result.length) this.push.apply(this, result);
                else this.push(result);
            }
            setSuccess();
        } catch (e) {
            setError(e);
        }
    }
};

// DOM handling. We recreate the <ol> from scratch every time(!) right now,
// but I'll fix that so I can add animation. At some point.

function redraw() {
    var ol = document.getElementById('stack');
    if (stack.length > 0) {
        ol.innerHTML = '';
        stack.forEach(function(d) {
            var li = document.createElement('li');
            li.innerText = d;
            ol.insertBefore(li, ol.firstElementChild);
        });
    } else {
        ol.innerHTML = '<li id="placeholder">(empty)</li>';
    }
}

function setError(e) {
    with(document.getElementById('error')) {
        style.display = 'block';
        innerHTML = e;
    }
}

function setSuccess() {
    with(document.getElementById('error')) {
        style.display = 'none';
        innerHTML = '';
    }
    localStorage.stack = JSON.stringify(stack);
}

// Since the operator keys dispatch, we are only maybe "parsing" out one
// number. So this is pretty cheap.

function parseTerm() {
    var entry = document.getElementById('entry');
    var val = entry.value;
    entry.value = '';
    var digits = /^_?[\d.]+/;
    while (val.match(digits)) {
        val = val.replace(digits, function(n) {
            stack.push(parseFloat(n.replace(/^_/, '-')));
            setSuccess();
            return '';
        });
    }
    return stack.dispatch(val);
}

function setEntry(val) {
    document.getElementById('entry').value = val;
}

// Backspace only sends KeyDown for some reason.

function keyDown(ev) {
    if (ev.which == 8 && document.getElementById('entry').value == '') {
        stack.dispatch('pop');
        ev.preventDefault();
        redraw();
    }
}

function keyPress(ev) {
    switch (ev.which) {
    case 13: // enter
    case 32: // space
    case 44: // ,
        parseTerm();
        break;
    case 37: // %
    case 38: // &
    case 42: // *
    case 43: // +
    case 45: // -
    case 47: // /
    case 59: // ;
    case 92: // \
    case 94: // ^
    case 124: // |
    case 126: // ~
        parseTerm();
        stack.dispatch(String.fromCharCode(ev.which));
        break;
    default:
        return;
    }
    ev.preventDefault();
    redraw();
}

function init() {
    document.getElementById('entry').focus();
    if (localStorage.stack) {
        stack.push.apply(stack, JSON.parse(localStorage.stack));
    } else {
        setError('welcome! <a href="help.html" target="_blank">' +
                 '(want instructions?)</a>');
    }
    redraw();
}
