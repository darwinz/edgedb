/*
* Copyright (c) 2011-2012 Sprymix Inc.
* All rights reserved.
*
* See LICENSE for details.
**/


// %from . import json


this.sx = (function(global) {
    'use strict';

    var undefined = void(0),
        sx = function(selector) { return new sx._fn.init(selector); },
        _is_id = /^#([\w\-]*)$/,
        _id_counter = 0,
        _unescape_entities = {
            '&amp;': '&',
            '&gt;': '>',
            '&lt;': '<',
            '&quot;': '"',
            '&#39;': "'",
            '&#x2F;': '/'
        },
        _unescape_fn = function(match, entity) {
            console.log(entity);
            return entity in _unescape_entities ? _unescape_entities[entity]
                                                : String.fromCharCode(parseInt(entity.substr(2)));
        },
        has_own_property = Object.prototype.hasOwnProperty,
        NodeList = (typeof window != 'undefined' && window.NodeList) ? window.NodeList : null;

    function _apply(obj /*, ... */) {
        var i = 1,
            len = arguments.length,
            property, arg;

        for (; i < len; i++) {
            arg = arguments[i];
            for (property in arg) {
                if (has_own_property.call(arg, property)) {
                    obj[property] = arg[property];
                }
            }
        }

        return obj;
    };

    var Error = function(msg) {
        this.message = msg;
    };
    Error.prototype = {
        name: 'sx.Error',
        toString: function() {
            return this.name + ': ' + this.message;
        }
    };
    Error.toString = function() {
        return 'sx.Error';
    };

    _apply(sx, {
        Error: Error,

        id: function(suffix) {
            return 'sx-id-' + (++_id_counter) + (suffix || '');
        },

        apply: _apply,

        is_array: function sx_is_array(obj) {
            return Object.prototype.toString.call(obj) === '[object Array]';
        },

        is_function: function sx_is_function(obj) {
            return Object.prototype.toString.call(obj) === '[object Function]';
        },

        is_object: function sx_is_object(obj) {
            return !!obj && Object.prototype.toString.call(obj) === '[object Object]';
        },

        is_string: function sx_is_string(obj) {
            return Object.prototype.toString.call(obj) === '[object String]';
        },

        _validate_sx_object: function(obj) {
            return Object.prototype.hasOwnProperty.call(obj, '_secret_')
                                                    && obj._secret_ === sx._secret_;
        },

        ns: (function() {
            var ns = function(ns, obj) {
                var i, chunks = ns.split('.'),
                    len = chunks.length,
                    chunk,
                    cursor = global;

                if (obj !== undefined) {
                    len--;
                }

                for (i = 0; i < len; i++) {
                    chunk = chunks[i];
                    if (!has_own_property.call(cursor, chunk)) {
                        cursor[chunk] = {};
                    }

                    cursor = cursor[chunk];
                }

                if (obj !== undefined) {
                    chunk = chunks[i];

                    if (has_own_property.call(cursor, chunk)) {
                        throw new Error('sx.ns: conflicting namespace: "' + ns + '"');
                    }

                    cursor[chunk] = obj;
                }

                return obj;
            };

            var r = ns.resolve_from = function(root, ns, deflt) {
                var i, chunks = ns.split('.'),
                    len = chunks.length,
                    cursor = root,
                    chunk;

                for (i = 0; i < len; i++) {
                    chunk = chunks[i];
                    cursor = cursor[chunk];
                    if (cursor == undefined) {
                        if (deflt !== undefined) {
                            return deflt;
                        }
                        throw new Error('unable to resolve ns "' + ns + '"');
                    }
                }

                return cursor;
            };

            ns.resolve = function(ns, deflt) {
                return r(global, ns, deflt);
            };

            return ns;
        })(),

        eq: function sx_eq(obj1, obj2) {
            if (typeof obj1 != typeof obj2) {
                return false;
            }

            var i;

            if (sx.is_array(obj1) && sx.is_array(obj2)) {
                if (obj1.length != obj2.length) {
                    return false;
                }

                for (i = 0; i < obj1.length; i++) {
                    if (!sx.eq(obj1[i], obj2[i])) {
                        return false;
                    }
                }

                return true;
            }

            if (sx.is_object(obj1) && sx.is_object(obj2)) {
                if (sx.len(obj1) != sx.len(obj2)) {
                    return false;
                }

                for (i in obj1) {
                    if (!sx.eq(obj1[i], obj2[i])) {
                        return false;
                    }
                }

                return true;
            }

            return obj1 === obj2;
        },

        each: function sx_each(obj, func, scope) {
            scope = scope || global;

            if (func.length < 1 || func.length > 3) {
                throw new Error('invalid each function "' + func +
                                '", should have one, two or three arguments only');
            }

            var i, r, no_desc = (func.length <= 2), len;

            if (sx.is_array(obj) || (obj instanceof sx) || (NodeList && (obj instanceof NodeList))) {
                len = obj.length;
                if (no_desc) {
                    for (i = 0; i < len; i++) {
                        r = func.call(scope, obj[i], i);

                        if (r !== undefined) {
                            return r;
                        }
                    }
                } else {
                    for (i = 0; i < len; i++) {
                        r = func.call(scope, obj[i], i, {
                            first: i == 0,
                            last: i == obj.length - 1,
                            key: i
                        });

                        if (r !== undefined) {
                            return r;
                        }
                    }
                }

            } else if (sx.is_object(obj)) {
                var cnt = 0;
                len = sx.len(obj);

                if (no_desc) {
                    for (i in obj) {
                        if (obj.hasOwnProperty(i)) {
                            r = func.call(scope, obj[i], i);

                            if (r !== undefined) {
                                return r;
                            }
                            cnt++;
                        }
                    }
                } else {
                    for (i in obj) {
                        if (obj.hasOwnProperty(i)) {
                            r = func.call(scope, obj[i], i, {
                                first: cnt == 0,
                                last: cnt == len - 1,
                                key: i
                            });

                            if (r !== undefined) {
                                return r;
                            }
                            cnt++;
                        }
                    }
                }

            } else {
                throw new Error("unable to iterate non-iterable object '" + obj +
                                "', has to be either array or object");
            }
        },

        map: function(obj, func, scope) {
            scope = scope || global;

            var result;
            var no_desc = (func.length <= 2);
            var map_func;

            if (sx.is_array(obj) || obj instanceof sx) {
                result = [];
            } else if (sx.is_object(obj)) {
                result = {};
            } else {
                throw new Error("unable to map on non-iterable object '" + obj +
                                "', has to be either array or object");
            }

            if (no_desc) {
                map_func = function(el, i) {
                    result[i] = func.call(scope, el, i);
                };
            } else {
                map_func = function(el, i, options) {
                    result[i] = func.call(scope, el, i, options);
                };
            }

            sx.each(obj, map_func, scope);

            return result;
        },

        filter: function(obj, func, scope) {
            scope = scope || global;

            var is_array = (sx.is_array(obj) || obj instanceof sx);
            var result;
            var no_desc = (func.length <= 2);
            var filter_func;

            if (is_array) {
                result = [];

                if (no_desc) {
                    filter_func = function(el, i) {
                        if (func.call(scope, el, i)) {
                            result.push(el);
                        }
                    };
                } else {
                    filter_func = function(el, i, options) {
                        if (func.call(scope, el, i, options)) {
                            result.push(el);
                        }
                    };
                }
            } else if (sx.is_object(obj)) {
                result = {};

                if (no_desc) {
                    filter_func = function(el, i) {
                        if (func.call(scope, el, i)) {
                            result[i] = el;
                        }
                    };
                } else {
                    filter_func = function(el, i, options) {
                        if (func.call(scope, el, i, options)) {
                            result[i] = el;
                        }
                    };
                }
            } else {
                throw new Error("unable to filter on non-iterable object '" + obj +
                                "', has to be either array or object");
            }

            sx.each(obj, filter_func, scope);

            return result;
        },

        keys: function sx_keys(obj) {
            if (sx.is_object(obj)) {
                var result = []
                for (var k in obj) {
                    if (has_own_property.call(obj, k)) {
                        result.push(k);
                    }
                }

                return result;
            } else {
                throw new Error('sx.keys function only supports objects, got ' + (typeof obj));
            }
        },

        len: function sx_len(obj) {
            if (sx.is_array(obj) || obj instanceof sx) {
                return obj.length;
            }

            if (sx.is_object(obj)) {
                var attr, len = 0;
                for (attr in obj) {
                    if (obj.hasOwnProperty(attr)) {
                        len++;
                    }
                }
                return len;
            }

            if (sx.is_string(obj)) {
                return obj.length;
            }

            throw new Error('sx.len function supports only objects and arrays, got ' +
                            (typeof obj));
        },

        hasattr: function sx_hasattr(obj, attr, weak) {
            if (obj === null || obj === undefined) {
                return false;
            }

            if (weak) {
                return obj[attr] !== undefined;
            } else {
                return has_own_property.call(obj, attr);
            }
        },

        first: function(obj, def) {
            var is_array = (sx.is_array(obj) || obj instanceof sx);
            if (is_array) {
                if (obj.length > 0) {
                    return obj[0];
                } else {
                    if (arguments.length > 1) {
                        return def;
                    } else {
                        throw new Error('sx.first: empty array passed with no default value set');
                    }
                }
            } else if (sx.is_object(obj)) {
                var i;
                for (i in obj) {
                    if (has_own_property.call(obj, i)) {
                        return obj[i];
                    }
                }

                if (arguments.length > 1) {
                    return def;
                }

                throw new Error('sx.first: empty object passed with no default value set');
            } else if (sx.is_string(obj)) {
                if (obj.length > 0) {
                    return obj[0];
                } else {
                    if (arguments.length > 1) {
                        return def;
                    } else {
                        throw new Error('sx.first: empty string passed with no default value set');
                    }
                }
            }

            throw new Error('sx.first supports only arrays and objects');
        },

        getattr: function sx_getattr(obj, attr, def) {
            if (has_own_property.call(obj, attr)) {
                return obj[attr];
            } else {
                if (def === undefined) {
                    throw new Error((typeof obj) + ': unable to get attribute ' + attr);
                }
                return def;
            }
        },

        contains: function(container, obj) {
            if (sx.is_object(container)) {
                if (!sx.is_string(obj)) {
                    throw new Error('sx.contains: only strings may be keys in javascript ' +
                                    'objects, got ' + (typeof obj));
                }
                return has_own_property.call(container, obj);
            }

            if (sx.is_array(container)) {
                if (Array.prototype.hasOwnProperty('indexOf')) {
                    return container.indexOf(obj) != -1;
                } else {
                    for (var i = 0; i < container.length; i++) {
                        if (container[i] === obj) {
                            return true;
                        }
                    }

                    return false;
                }
            }

            if (sx.is_string(container)) {
                if (!sx.is_string(obj)) {
                    throw new Error('sx.contains: expected string "obj" value, got ' +
                                     (typeof obj));
                }
                return container.indexOf(obj) !== -1;
            }

            throw new Error('sx.contains function supports only objects and arrays, got ' +
                            (typeof obj));
        },

        partial: (function() {
            if (Function.prototype.bind) {
                var func = Function.prototype.call.bind(Function.prototype.bind);
                func.displayName = 'sx_partial';
                return func;
            } else {
                return function sx_partial(func, scope/*, arg0, arg2, ...*/) {
                    var args = null;

                    if (arguments.length > 2) {
                        args = Array.prototype.slice.call(arguments, 2);
                    }

                    if (scope === undefined) {
                        scope = global;
                    }

                    if (args && args.length) {
                        return (function(func, scope, args) {
                            return function() {
                                var args_copy = Array.prototype.slice.call(args);
                                args_copy.push.apply(args_copy, arguments);
                                return func.apply(scope, args_copy);
                            };
                        })(func, scope, args);
                    } else {
                        return (function(func, scope) {
                            return function() {
                                return func.apply(scope, arguments);
                            };
                        })(func, scope);
                    }
                };
            }
        })(),

        escape: function(str) {
            return String(str).replace(/\&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        },

        unescape: (function() {
            var entities = [];
            for (var entity in _unescape_entities) {
                if (_unescape_entities.hasOwnProperty(entity)) {
                    entities.push(entity);
                }
            }

            var _re = new RegExp('(' + entities.join('|') + '|' + '&#[0-9]{1,5};' + ')', 'g');

            return function(str) {
                return str ? String(str).replace(_re, _unescape_fn) : str;
            }
        })(),

        uuid4: function() {
            function s(num) {
                return (((1 + Math.random()) * num) | 0).toString(16);
            }

            return s(0x10000000) + '-' + s(0x1000) + '-4' + s(0x100) + '-a' +
                                                s(0x100) + '-' + s(0x1000) + s(0x1000) + s(0x1000);
        },

        json: {
            parse: (function() {
                if (typeof JSON != 'undefined') {
                    return JSON.parse;
                } else {
                    return global.sx_json_parse;
                }
            })()
        },

        random: {
            choice: function(a) {
                return a[Math.floor(Math.random() * a.length)];
            }
        },

        array: {
            bisect_right: function(a, x, lo, hi) {
                if (typeof lo == 'undefined') {
                    lo = 0;
                }

                if (lo < 0) {
                    throw new sx.Error('bisect: lo must not be negative');
                }

                if (typeof hi == 'undefined') {
                    hi = a.length;
                }

                var middle;

                while (lo < hi) {
                    middle = (lo + hi) >> 1;
                    if (x < a[middle]) {
                        hi = middle;
                    } else {
                        lo = middle + 1;
                    }
                }

                return lo;
            },

            bisect_left: function(a, x, lo, hi) {
                if (typeof lo == 'undefined') {
                    lo = 0;
                }

                if (lo < 0) {
                    throw new sx.Error('bisect: lo must not be negative');
                }

                if (typeof hi == 'undefined') {
                    hi = a.length;
                }

                var middle;

                while (lo < hi) {
                    middle = (lo + hi) >> 1;
                    if (a[middle] < x) {
                        lo = middle + 1;
                    } else {
                        hi = middle;
                    }
                }

                return lo;
            },

            insort_right: function(a, x, lo, hi) {
                a.splice(sx.array.bisect_right(a, x, lo, hi), 0, x);
            },

            insort_left: function(a, x, lo, hi) {
                a.splice(sx.array.bisect_left(a, x, lo, hi), 0, x);
            }
        },

        str: {
            shorten: function(str, max) {
                if (str.length >= max) {
                    str = str.substring(0, max) + '...';
                }
                return str;
            },

            trim: function(str) {
                return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
            },

            startswith: function(str, sub) {
                return str.indexOf(sub) === 0;
            },

            endswith: function(str, sub) {
                var sublen = sub.length, strlen = str.length;

                if (!sublen) {
                    return true;
                }

                if (sublen > strlen) {
                    return false;
                }

                return str.lastIndexOf(sub) === str.length - sublen;
            },

            rpartition: function sx_rpartition(str, separator) {
                if (!separator) {
                    throw new sx.Error('empty separator');
                }

                var seplen = separator.length;
                var lastpos = str.lastIndexOf(separator);

                if (lastpos != -1) {
                    return [str.substr(0, lastpos), separator, str.substr(lastpos + seplen)];
                } else {
                    return ['', '', str];
                }
            }
        },

        date: {
            parse_iso: (function() {
                var parse_re = new RegExp(
                        /* date: {YYYY|(+|-YYYYY)}[-MM[-DD]] */
                        '^(\\d{4}|[\\+\\-]\d{5})(?:\\-(\\d{2})(?:\\-(\\d{2})'
                        /* time: HH[:MM[:SS.sfraction]] | HH[MM[SS.sfraction]] */
                        + '(?:(?:T|\\s+)?(\\d{2})(?::?(\\d{2})(?::?(\\d{2})(?:\\.(\\d+))?)?)?'
                        /* time offset: 'Z' | {+|-}HH[MM] | {+|-}HH[:MM] */
                        + '(Z|(?:([\\-\\+])(\\d{2})(?::?(\\d{2}))?))?)?)?)?$'),
                    month_offsets = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];

                var _is_leap = function(year) {
                    return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
                };

                var _unix_day = function(year, month) {
                    var ytd_days = month_offsets[month] + ((month > 1 && _is_leap(year)) ? 1 : 0),
                        leap_years_since_epoch = Math.floor((year - 1970) / 4);

                    return (year - 1970) * 365 + leap_years_since_epoch + ytd_days;
                };

                return function(value) {
                    var match = parse_re.exec(value);

                    if (!match) {
                        throw new sx.Error('sx.date.parse_iso: invalid date: "' + value + '"');
                    }

                    var year = Number(match[1]),
                        month = Number(match[2] || 1) - 1,
                        day = Number(match[3] || 1) - 1,
                        hour = Number(match[4] || 0),
                        minute = Number(match[5] || 0),
                        second = Number(match[6] || 0),
                        msecond = Number(match[7] || 0),
                        offset = !match[4] || match[8] ? 0 : Number(new Date(1970, 0)),
                        tzoffsetsign = (match[9] || '+') == '-' ? 1 : -1,
                        tzoffsethour = Number(match[10] || 0),
                        tzoffsetminute = Number(match[11] || 0),
                        valid,
                        unix_day;

                    // Reduce accuracy to milliseconds
                    if (msecond.toString().length > 3) {
                        msecond = Math.floor(msecond / 1000);
                    }

                    if (month > 11) {
                        throw new sx.Error('sx.date.parse_iso: invalid date: "' + value + '"');
                    }

                    unix_day = _unix_day(year, month);

                    valid = day >= 0 && day < (_unix_day(year, month + 1) - unix_day)
                            && hour < (((minute + second + msecond) > 0) ? 24 : 25)
                            && minute < 60
                            && second < 60
                            && tzoffsethour < 24
                            && tzoffsetminute < 60;

                    if (!valid) {
                        throw new sx.Error('sx.date.parse_iso: invalid date: "' + value + '"');
                    }

                    var hours = ((unix_day + day) * 24 + hour + tzoffsethour * tzoffsetsign),
                        minutes = hours * 60 + minute + tzoffsetminute * tzoffsetsign,
                        seconds = minutes * 60 + second,
                        milliseconds = seconds * 1000 + msecond + offset;

                    return new Date(milliseconds);
                };
            })()
        },

        dom: {
            id: function(suffix) {
                // sx.dom.id() is deprecated. Use sx.id() instead.
                return sx.id(suffix);
            },

            has_class: function(element, class_name) {
                if (!class_name || !element) {
                    return false;
                }

                return (' ' + element.className + ' ').indexOf(' ' + class_name + ' ') !== -1;
            },

            add_class: function(element, class_name) {
                if (!element || !class_name || typeof class_name != 'string' ||
                        !element.nodeType || element.nodeType != 1) {
                    return;
                }

                if (element.classList && class_name.indexOf(' ') == -1) {
                    return element.classList.add(class_name);
                }

                if (element.className && element.className.length) {
                    if (!element.className.match('\\b' + class_name + '\\b')) {
                        element.className += ' ' + class_name;
                    }
                } else {
                    element.className = class_name;
                }
            },

            remove_class: function(element, class_name) {
                if (!element || !class_name || typeof class_name != 'string' ||
                        !element.nodeType || element.nodeType != 1) {
                    return;
                }

                if (element.classList) {
                    return element.classList.remove(class_name);
                }

                if (element.className) {
                    var reg = new RegExp('(\\s|^)' + cls + '(\\s|$)');
                    element.className = element.className.replace(reg, ' ');
                }
            },

            toggle_class: function(element, class_name) {
                if (!class_name || !element) {
                    return false;
                }

                if (sx.dom.has_class(element, class_name)) {
                    sx.dom.remove_class(element, class_name);
                } else {
                    sx.dom.add_class(element, class_name);
                }
            },

            on: function(element, event, callback, scope/*, arg0, arg1, ... */) {
                if (scope === undefined) {
                    scope = element;
                }

                var args = Array.prototype.slice.call(arguments, 4);
                args.splice(0, 0, callback, scope);
                callback = sx.partial.apply(this, args);

                if (element.addEventListener) {
                    element.addEventListener(event, callback, false);
                } else if (element.attachEvent) {
                    element.attachEvent('on' + event, callback);
                }
            },

            _builder: function(root, spec) {
                var tag = spec['tag'] || null,
                    cls = spec['cls'] || null,
                    html = spec['html'] || null,
                    text = spec['text'] || null,
                    id = spec['id'] || null,
                    children = spec['children'] || null,
                    attrs = spec['attrs'] || null,
                    new_el, i;

                if (text && root && !tag && !html && !children && !id && !cls && !attrs) {
                    new_el = document.createTextNode(text);
                } else {
                    new_el = document.createElement(tag || 'div');

                    if (cls) {
                        sx.dom.add_class(new_el, cls);
                    }

                    if (id) {
                        new_el.setAttribute('id', id);
                    }

                    if (children && sx.is_object(children) && !sx.is_array(children)) {
                        children = [children];
                    }

                    if (children && children.length) {
                        for (i = 0; i < children.length; i++) {
                            sx.dom._builder(new_el, children[i]);
                        }
                    } else if (text) {
                        new_el.innerHTML = sx.escape(text);
                    } else if (html) {
                        new_el.innerHTML = html;
                    }

                    if (attrs) {
                        for (i in attrs) {
                            if (attrs.hasOwnProperty(i)) {
                                new_el.setAttribute(i, attrs[i]);
                            }
                        }
                    }
                }

                if (root) {
                    root.appendChild(new_el);
                }

                return new_el;
            },

            gen_html: function(spec) {
                var el = sx.dom._builder(null, {children: spec});
                return el.innerHTML;
            },

            replace: function(element, spec) {
                var child = sx.dom._builder(null, spec);
                element.parentNode.replaceChild(child, element);
            },

            update: function(element, spec) {
                if (typeof spec == 'string') {
                    element.innerHTML = spec;
                } else {
                    element.innerHTML = '';
                    element.appendChild(sx.dom._builder(null, spec));
                }
            },

            insert_before: function(element, spec) {
                var el = sx.dom._builder(null, spec);
                element.parentNode.insertBefore(el, element);
                return el;
            },

            append: function(element, spec) {
                var el = sx.dom._builder(null, spec);
                element.appendChild(el);
                return el;
            }
        }
    });

    sx._fn = sx.prototype = {
        constructor: sx,

        init: function(selector) {
            this.length = 0;

            if (!selector) {
                // In case of empty, null or undefined ``selector``
                //
                return this;
            }

            if (selector.nodeType) {
                // ``selector`` is a DOM element
                //
                this[0] = selector;
                this.length = 1;
                return this;
            }

            if (sx.is_array(selector)) {
                if (selector.length) {
                    // Assume we're dealing with an array of DOM elements
                    //
                    for (var i = 0; i < selector.length; i++) {
                        if (selector[i].nodeType) {
                            this[i] = selector[i];
                        } else {
                            throw new Error("non-DOM element passed in array to sx() function: " +
                                            selector[i]);
                        }
                    }

                    this.length = selector.length;
                }

                return this;
            }

            if (typeof selector != 'string') {
                throw new Error("non-string selector passed to 'sx' function: " + selector);
            }

            var match = _is_id.exec(selector);
            if (match && match.length && match[1]) {
                // selector matches '#(some_id)'
                //
                var el = document.getElementById(match[1]);

                if (el) {
                    this.length = 1;
                    this[0] = el;
                }
            } else {
                var els = document.querySelectorAll(selector);
                if (els && els.length) {
                    for (var i = 0; i < els.length; i++) {
                        this[i] = els[i];
                    }
                    this.length = els.length;
                }
            }

            return this;
        },

        each: function(func, scope) {
            sx.each(this, func, scope);
            return this;
        },

        empty: function() {
            return this.length <= 0;
        },

        has_class: function(class_name) {
            if (!this.length) {
                return false;
            }

            for (var i = 0; i < this.length; i++) {
                if (!sx.dom.has_class(this[i], class_name)) {
                    return false;
                }
            }

            return true;
        },

        add_class: function(class_name) {
            for (var i = 0; i < this.length; i++) {
                sx.dom.add_class(this[i], class_name);
            }
            return this;
        },

        remove_class: function(class_name) {
            for (var i = 0; i < this.length; i++) {
                sx.dom.remove_class(this[i], class_name);
            }
            return this;
        },

        toggle_class: function(class_name) {
            for (var i = 0; i < this.length; i++) {
                sx.dom.toggle_class(this[i], class_name);
            }
            return this;
        },

        update: function(spec) {
            for (var i = 0; i < this.length; i++) {
                sx.dom.update(this[i], spec);
            }
            return this;
        },

        on: function(event, callback, scope/*, arg0, arg2*/) {
            var args = Array.prototype.slice.call(arguments, 0);
            args.splice(0, 0, 'tmp');

            for (var i = 0; i < this.length; i++) {
                args.splice(0, 1, this[i]);
                sx.dom.on.apply(this, args);
            }
            return this;
        }
    };

    sx._fn.init.prototype = sx._fn;

    return sx;
})(this);
