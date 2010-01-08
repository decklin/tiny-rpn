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
    sq: function(a) { return a * a; },
    neg: function(a) { return -a; },
    inv: function(a) { return 1 / a; },

    // Bits
    '&': function(a, b) { return a & b; },
    '|': function(a, b) { return a | b; },
    '^': function(a, b) { return a ^ b; },
    '~': function(a) { return ~a; },

    // Logical
    or: function(a, b) { return a || b; },
    and: function(a, b) { return a && b; },
    not: function(a) { return !a; },

    // Logs
    log2: function(a) {
        return Math.log(a) / Math.LN2;
    },
    log10: function(a) {
        return Math.log(a) / Math.LN10;
    },
    alog: function(a) {
        return Math.pow(10, a);
    },
    expm: function(a) {
        return ops.exp.call(this, a) - 1;
    },

    // Trig helpers
    deg: function(a) {
        return Math.PI * a / 180;
    },

    // Misc
    fact: function(a) {
        if (a < 1 || a != Math.floor(a))
            throw 'factorial: need a positive integer';
        for (var fac = a; --a; fac *= a);
        return fac;
    },
    gcd: function(a, b) {
        return b == 0 ? a : ops.gcd(b, a % b);
    },
    sum: function() {
        this.pushOnto(null, [this.reduce(ops['+'])]);
    },
    prod: function() {
        this.pushOnto(null, [this.reduce(ops['*'])]);
    },


    // Stack
    swap: function(a, b) {
        return [b, a];
    },
    pop: function(a) {
        document.getElementById('entry').value = a;
        return [];
    },
    drop: function(a) {
        return [];
    },
    drop2: function(a, b) {
        return [];
    },
    dropn: function(a) {
        // Ergh, gotta skip over our arg.
        for (var i = 0, p = this.curHead().next; i < a; i++)
            p = p.next;
        this.pushOnto(p, []);
    },
    dup: function(a) {
        return [a, a];
    },
    dup2: function(a) {
        return [a, a, a];
    },
    dupn: function(a, b) {
        var dups = [a];
        for (var i = 0; i < b; i++) dups.push(a);
        return dups;
    },
    clear: function() {
        this.pushOnto(null, []);
    },

    // Radix setting
    iradix: function(a) {
        inputRadix = a;
        return [];
    },
    oradix: function(a) {
        outputRadix = a;
        return [];
    },
    rradix: function() {
        inputRadix = outputRadix = 10;
        return [];
    },

    // Meta
    undo: function() {
        this.rollBack();
    },
    noop: function() {
        return [];
    }
};

// Fill in the rest using the builtin Math object. For some reason, we
// can't enumerate it, so here's a list of the interesting attributes.

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
mathFunctions.forEach(function(f) {
    ops[f] = Math[f];
});

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
mathConstants.forEach(function(c) {
    ops[c] = function() { return Math[c]; };
});

// Standard aliases

ops['!'] = ops.fact;
ops.ln = ops.log;

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
    reduce: function(f) {
        return this.get().reduce(f);
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
    return v instanceof Array ? v : [v];
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
    config.set('curStack', stack.get().reverse());
}

// The user hit a dispatching key (maybe an op, maybe just whitespace), so
// we should have either a number or a command in the entry box.

function handleTerm(entry) {
    var val = entry.value;
    if (val) {
        entry.value = '';
        var n = parseTerm(val);
        if (n) {
            stack.push(n);
            setSuccess();
        } else {
            stack.dispatch(val);
        }
    }
}

function parseTerm(s) {
    var match = stringTerm.exec(s);
    if (match) {
        return match[1];
    } else {
        var n = parseNumber(s.replace(/^_/, '-'));
        return isNaN(n) ? undefined : n;
    }
}

function parseNumber(s) {
    return inputRadix == 10 ? parseFloat(s) : parseInt(s, inputRadix);
}

// The "special" keys need to be snatched up on KeyDown...

var ctrlBindings = {
    'T': 'swap',
    'Z': 'undo'
};

function keyDown(ev) {
    if (ev.which == 8 && ev.target.value == '') {
        stack.dispatch('pop');
        ev.preventDefault();
        redraw();
    } else if (ev.ctrlKey) {
        var c = String.fromCharCode(ev.which);
        if (ctrlBindings[c]) {
            handleTerm(ev.target);
            stack.dispatch(ctrlBindings[c]);
            ev.preventDefault();
            redraw();
        }
    }
}

// But the rest should be processed after they arrive. Operator or
// separator chars will dispatch, unless we're in the middle of a
// string.
//
// Note: there is at least one single-character "function" sort of
// operator (the constant 'E' from Math.E), and for the sake of not
// surprising users we will only dispatch on nonalphanumeric chars.

function keyPress(ev) {
    var c = String.fromCharCode(ev.which);
    var isOp = !alphaNumeric.test(c) && ops[c];
    if (!openString.test(ev.target.value) && (isOp || termSep.test(c))) {
        handleTerm(ev.target);
        if (ops[c]) stack.dispatch(c);
        ev.preventDefault();
        redraw();
    }
}

var stack;
var termSep = /[\s,]/;
var openString = /^"[^"]*$/;
var stringTerm = /^"([^"]*)"?$/;
var alphaNumeric = /\w+/;
var inputRadix = 10;
var outputRadix = 10;

if (config.has('customOps'))
    eval('(function(){'+config.get('customOps')+'})();');

function init() {
    if (config.has('curStack')) {
        stack = new UndoableStack(config.get('curStack'));
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
