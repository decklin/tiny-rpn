if (!localStorage.customOps) localStorage.customOps =
'\
ops[\'!\'] = ops[\'fact\'] = function(a) {\n\
    if (a < 1 || a != Math.floor(a))\n\
        throw \'factorial only defined on nonnegative integers\';\n\
    var fac = a;\n\
    while (--a) fac *= a;\n\
    return fac;\n\
};\n\
\n\
ctrlBindings[\'N\'] = \'neg\';\
';
