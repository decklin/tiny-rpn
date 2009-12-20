// Table of operations. For an explanation of how they should work, refer
// to the documentation on the options page.

var ops = {
    // Arithmetic
    '+': function(a, b) { return a + b; },
    '-': function(a, b) { return a - b; },
    '*': function(a, b) { return a * b; },
    '+': function(a, b) { return a + b; },
    '/': function(a, b) { return a / b; },
    '%': function(a, b) { return a % b; },
    'neg': function(a) { return -a; },

    // Bits
    '&': function(a, b) { return a & b; },
    '|': function(a, b) { return a | b; },
    '^': function(a, b) { return a ^ b; },
    '~': function(a) { return ~a; },

    // Logical
    'or': function(a, b) { return a || b; },
    'and': function(a, b) { return a && b; },
    'not': function(a) { return !a; },

    // Misc
    'fact': function(a) {
        if (a < 1 || a != Math.floor(a))
            throw 'factorial only defined for non-negative integers';
        for (var fac = a; --a; fac *= a);
        return fac;
    },

    // Stack
    'swap': function(a, b) { return [b, a]; },
    'pop': function(a) { setEntry(a); return []; },
    'drop': function(a) { return []; },
    'drop2': function(a, b) { return []; },
    'dup': function(a) { return [a, a]; },
    'dup2': function(a) { return [a, a, a]; },
    'clear': function() { this.pushOnto(null, []); },

    // Meta
    'undo': function() { this.rollBack(); },
    'iradix': function(a) { inputRadix = a; return []; },
    'oradix': function(a) { outputRadix = a; return []; },
    'rradix': function() { inputRadix = outputRadix = 10; return []; },
    'noop': function() { return []; }

};

// Standard aliases

ops['!'] = ops['fact'];

// Fill in some simple things using the builtin Math object. For some
// reason, we can't enumerate it, so here's a list of the interesting
// attributes.

var mathFunctions = [
    'abs',
    'acos',
    'asin',
    'atan',
    'atan2',
    'ceil',
    'cos',
    'exp',
    'floor',
    'log',
    'max',
    'min',
    'pow',
    'random',
    'round',
    'sin',
    'sqrt',
    'tan'
];
var mathConstants = [
    'E',
    'LN2',
    'LN10',
    'LOG2E',
    'LOG10E',
    'PI',
    'SQRT1_2',
    'SQRT2'
];

mathFunctions.forEach(function(f) {
    ops[f] = Math[f];
});
mathConstants.forEach(function(c) {
    ops[c] = function() { return Math[c]; };
});

// Our stack is implemented as a bunch of immutable linked lists that
// share structure. The user can therefore undo back to any previous
// point in time by popping the (mutable) list of head pointers.

function UndoableStack(vals) {
    this.heads = [];
    if (vals)
        this.pushOnto(null, vals);
}

function Datum(val, next) {
    this.value = val;
    this.next = next;
}

UndoableStack.prototype = {
    curHead: function() {
        return this.heads.length ? this.heads[this.heads.length-1] : null;
    },
    pushOnto: function(head, vals) {
        vals.forEach(function(v) { head = new Datum(v, head); });
        this.heads.push(head);
    },
    push: function(val) {
        this.heads.push(new Datum(val, this.curHead()));
    },
    pop: function() {
        this.heads.push(this.curHead().next);
    },
    rollBack: function() {
        if (this.heads.length > 1)
            this.heads.pop();
        else
            throw 'nothing to undo';
    },
    get: function() {
        for (var p = this.curHead(), vals = []; p; p = p.next)
            vals.push(p.value);
        return vals;
    },
    dispatch: function(op) {
        var f = ops[op];
        if (!f) {
            setError('unknown command: ' + op);
        } else if (f.length > this.get().length) {
            setError('stack too small (' + op + ' needs ' + f.length +
                     ' argument' + (f.length > 1 ? 's' : '') + ')');
        } else {
            try {
                var args = [], head = this.curHead();
                for (var i = 0; i < f.length; i++) {
                    args.unshift(head.value);
                    head = head.next;
                }
                var result = f.apply(this, args);
                if (result !== undefined)
                    this.pushOnto(head, makeList(result));
                setSuccess();
            } catch (e) {
                setError(e);
            }
        }
    }
};

function makeList(v) {
    return v.length == undefined ? [v] : v;
}

// DOM handling. We recreate the <ol> from scratch every time(!) right now,
// but I'll fix that so I can add animation. At some point.

function redraw() {
    var ol = document.getElementById('stack');
    if (stack.curHead()) {
        ol.innerHTML = '';
        stack.get().forEach(function(v) {
            var li = document.createElement('li');
            li.innerText = v.toString(outputRadix);
            ol.appendChild(li);
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
    localStorage.curStack = JSON.stringify(stack.get().reverse());
}

// The user hit a dispatching key (maybe an op, maybe just whitespace), so
// we should have either a number or a command in the entry box.

function parseTerm() {
    var entry = document.getElementById('entry');
    var val = entry.value;
    if (val) {
        entry.value = '';
        var parsed = parseNumber(val);
        if (isNaN(parsed)) {
            stack.dispatch(val);
        } else {
            stack.push(parsed);
            setSuccess();
        }
    }
}

function parseNumber(s) {
    s = s.replace(/^_/, '-');
    return inputRadix == 10 ? parseFloat(s) : parseInt(s, inputRadix);
}

function setEntry(val) {
    document.getElementById('entry').value = val;
}

// The "special" keys need to be snatched up on KeyDown...

var ctrlBindings = {
    'T': 'swap',
    'Z': 'undo'
};

function keyDown(ev) {
    if (ev.which == 8 && document.getElementById('entry').value == '') {
        stack.dispatch('pop');
        ev.preventDefault();
        redraw();
    } else if (ev.ctrlKey) {
        var c = String.fromCharCode(ev.which);
        if (ctrlBindings[c]) {
            parseTerm();
            stack.dispatch(ctrlBindings[c]);
            ev.preventDefault();
            redraw();
        }
    }
}

// But the rest should be processed after they arrive.

function keyPress(ev) {
    var c = String.fromCharCode(ev.which);
    if (ops[c] || termSep.test(c)) {
        parseTerm();
        if (ops[c]) stack.dispatch(c);
        ev.preventDefault();
        redraw();
    }
}

var stack;
var termSep = /[\s,]/;
var inputRadix = 10;
var outputRadix = 10;

if (localStorage.customOps)
    eval(localStorage.customOps);

function init() {
    if (localStorage.curStack) {
        stack = new UndoableStack(JSON.parse(localStorage.curStack));
    } else {
        stack = new UndoableStack();
        setError('welcome! <a href="help.html" target="_blank">' +
                 '(want instructions?)</a>');
    }
    document.getElementById('entry').focus();
    redraw();
    // Another big ugly hack: attempt to determine if we are being loaded
    // outside of the popup by checking outerHeight. No guarantees this will
    // continue to work!
    if (window.outerHeight)
        document.body.style.padding = '5px';
}
