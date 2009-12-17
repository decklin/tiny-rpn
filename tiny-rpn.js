// Table of operations.
//
// RULES FOR OPS:
//
//   1. Take the number of arguments that you want popped from the stack.
//      They will be applied to you in bottom-up order.
//
//   2. If you are pure, return a list of values you want pushed back
//      onto the stack (again, bottom-up). The resulting head will be
//      pushed onto the undo list.
//
//      NOTE: If you only have one value to return, you can cheat and
//      return it directly instead of wrapping it in a list. It's an ugly
//      hack, but it lets us reuse Math.* without boilerplate.
//
//   3. If you have side effects, don't return anything, just create a
//      new head (nothing will be pushed onto the undo list above it).

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
    'pop': function(a) { setEntry(a); return []; },
    'drop': function(a) { return []; },
    'drop2': function(a, b) { return []; },
    'dup': function(a) { return [a, a]; },
    'dup2': function(a) { return [a, a, a]; },
    'clear': function() { this.pushOnto(null, []); },

    // Meta
    'undo': function() { this.rollBack(); },
    'noop': function() { return []; }

};

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
    length: function() {
        var n = 0;
        for (var p = this.curHead(); p; p = p.next)
            n++;
        return n;
    },
    forEach: function(f) {
        for (var p = this.curHead(); p; p = p.next)
            f(p.value);
    },
    dispatch: function(op) {
        if (op)
            var f = ops[op];
        else
            return;
        if (!f) {
            setError('unknown command: ' + op);
        } else if (f.length > this.length()) {
            setError('not enough numbers on stack');
        } else {
            try {
                var args = [], head = this.curHead();
                for (var i = 0; i < f.length; i++) {
                    args.unshift(head.value);
                    head = head.next;
                }
                var result = f.apply(this, args);
                if (result)
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
        stack.forEach(function(v) {
            var li = document.createElement('li');
            li.innerText = v;
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
    var curStack = [];
    stack.forEach(function(v) { curStack.unshift(v); });
    localStorage.curStack = JSON.stringify(curStack);
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
    if (ev.ctrlKey) {
        switch (ev.which) {
        case 84: // T
            stack.dispatch('swap');
            ev.preventDefault();
            redraw();
            break;
        case 90: // Z
            stack.dispatch('undo');
            ev.preventDefault();
            redraw();
            break;
        }
    }
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

var stack;

function init() {
    document.getElementById('entry').focus();
    if (localStorage.curStack) {
        stack = new UndoableStack(JSON.parse(localStorage.curStack));
    } else {
        stack = new UndoableStack();
        setError('welcome! <a href="help.html" target="_blank">' +
                 '(want instructions?)</a>');
    }
    redraw();
}
