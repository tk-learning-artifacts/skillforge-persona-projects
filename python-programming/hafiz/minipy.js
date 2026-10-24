/* MiniPy: a small Python 3 interpreter in plain JavaScript, so a beginner
   program runs on this page with nothing to install. It covers what a first
   Python course uses: variables, if/elif/else, while and for loops,
   functions, lists, dictionaries, strings, f-strings, input(), open() and the
   csv module. matplotlib.pyplot is a stand-in that draws an SVG chart.
   It is not full Python. Error messages copy CPython 3.13's wording for the
   errors beginners meet most. */
(function (root) {
  'use strict';

  // ---------- values ----------
  class PyFloat { constructor(v) { this.v = v; } }
  class Tuple { constructor(items) { this.items = items; } }
  class PyRange { constructor(start, stop, step) { this.start = start; this.stop = stop; this.step = step; } }
  class PyDict {
    constructor() { this.map = new Map(); }
    static key(k) {
      if (typeof k === 'string') return 's' + k;
      if (typeof k === 'number') return 'n' + k;
      if (typeof k === 'boolean') return 'n' + (k ? 1 : 0);
      if (k instanceof PyFloat) return 'n' + k.v;
      if (k === null) return 'N';
      if (k instanceof Tuple) return 't(' + k.items.map(PyDict.key).join(',') + ')';
      throw new PyError('TypeError', "unhashable type: '" + typeName(k) + "'");
    }
    get(k) { const e = this.map.get(PyDict.key(k)); return e ? e[1] : undefined; }
    set(k, v) { const h = PyDict.key(k); const e = this.map.get(h); if (e) e[1] = v; else this.map.set(h, [k, v]); }
    has(k) { return this.map.has(PyDict.key(k)); }
    del(k) { return this.map.delete(PyDict.key(k)); }
    keys() { return [...this.map.values()].map((e) => e[0]); }
    values() { return [...this.map.values()].map((e) => e[1]); }
    entries() { return [...this.map.values()]; }
    get size() { return this.map.size; }
  }
  class DictView { constructor(kind, dict) { this.kind = kind; this.dict = dict; } list() { return this.kind === 'keys' ? this.dict.keys() : this.kind === 'values' ? this.dict.values() : this.dict.entries().map((e) => new Tuple([e[0], e[1]])); } }
  class PyIter { constructor(items, kind) { this.items = items; this.i = 0; this.kind = kind || 'iterator'; } }
  class PyFunc { constructor(name, params, body, closure, line, isLambda) { this.name = name; this.params = params; this.body = body; this.closure = closure; this.line = line; this.isLambda = isLambda; this.locals = isLambda ? new Set(params.map((p) => p.name)) : localNames(params, body); } }
  class Builtin { constructor(name, fn, gen) { this.name = name; this.fn = fn; this.gen = !!gen; } }
  class Bound { constructor(self, name, fn, gen) { this.self = self; this.name = name; this.fn = fn; this.gen = !!gen; } }
  class PyModule { constructor(name, attrs) { this.name = name; this.attrs = attrs; } }
  class PyType { constructor(name, call) { this.name = name; this.call = call; } }
  class PyFile { constructor(name, text) { this.name = name; this.lines = text.match(/[^\n]*\n|[^\n]+$/g) || []; this.i = 0; this.closed = false; } }

  class PyError {
    constructor(type, msg) { this.type = type; this.msg = msg; this.frames = null; this.line = null; }
  }
  const BREAK = { sig: 'break' }, CONTINUE = { sig: 'continue' };

  // ---------- helpers ----------
  const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const isInt = (v) => typeof v === 'number' || typeof v === 'boolean';
  const isNum = (v) => isInt(v) || v instanceof PyFloat;
  const num = (v) => (v instanceof PyFloat ? v.v : v === true ? 1 : v === false ? 0 : v);
  const F = (v) => new PyFloat(v);

  function typeName(v) {
    if (v === null || v === undefined) return 'NoneType';
    if (typeof v === 'boolean') return 'bool';
    if (typeof v === 'number') return 'int';
    if (v instanceof PyFloat) return 'float';
    if (typeof v === 'string') return 'str';
    if (Array.isArray(v)) return 'list';
    if (v instanceof Tuple) return 'tuple';
    if (v instanceof PyDict) return 'dict';
    if (v instanceof PyRange) return 'range';
    if (v instanceof DictView) return 'dict_' + v.kind;
    if (v instanceof PyFunc) return 'function';
    if (v instanceof Builtin || v instanceof Bound) return 'builtin_function_or_method';
    if (v instanceof PyModule) return 'module';
    if (v instanceof PyFile) return '_io.TextIOWrapper';
    if (v instanceof PyIter) return v.kind;
    if (v instanceof PyType) return 'type';
    return 'object';
  }

  function floatRepr(x) {
    if (Number.isNaN(x)) return 'nan';
    if (!Number.isFinite(x)) return x > 0 ? 'inf' : '-inf';
    if (x === 0) return Object.is(x, -0) ? '-0.0' : '0.0';
    const ex = x.toExponential(); // shortest digits that round-trip
    const m = ex.match(/^(-?)(\d)(?:\.(\d+))?e([+-]\d+)$/);
    const sign = m[1], digits = m[2] + (m[3] || ''), e = parseInt(m[4], 10);
    if (e < -4 || e >= 16) {
      const mant = digits.length > 1 ? digits[0] + '.' + digits.slice(1) : digits;
      const es = Math.abs(e) < 10 ? '0' + Math.abs(e) : String(Math.abs(e));
      return sign + mant + 'e' + (e < 0 ? '-' : '+') + es;
    }
    let s;
    if (e < 0) s = '0.' + '0'.repeat(-e - 1) + digits;
    else if (digits.length <= e + 1) s = digits + '0'.repeat(e + 1 - digits.length) + '.0';
    else s = digits.slice(0, e + 1) + '.' + digits.slice(e + 1);
    return sign + s;
  }

  function strRepr(s) {
    const q = s.includes("'") && !s.includes('"') ? '"' : "'";
    let out = q;
    for (const ch of s) {
      if (ch === '\\') out += '\\\\';
      else if (ch === q) out += '\\' + q;
      else if (ch === '\n') out += '\\n';
      else if (ch === '\t') out += '\\t';
      else if (ch === '\r') out += '\\r';
      else if (ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127) out += '\\x' + ch.charCodeAt(0).toString(16).padStart(2, '0');
      else out += ch;
    }
    return out + q;
  }

  function repr(v) {
    if (typeof v === 'string') return strRepr(v);
    return str(v, true);
  }
  function str(v, inner) {
    if (v === null || v === undefined) return 'None';
    if (typeof v === 'boolean') return v ? 'True' : 'False';
    if (typeof v === 'number') return String(v);
    if (v instanceof PyFloat) return floatRepr(v.v);
    if (typeof v === 'string') return inner ? strRepr(v) : v;
    if (Array.isArray(v)) return '[' + v.map(repr).join(', ') + ']';
    if (v instanceof Tuple) return v.items.length === 1 ? '(' + repr(v.items[0]) + ',)' : '(' + v.items.map(repr).join(', ') + ')';
    if (v instanceof PyDict) return '{' + v.entries().map((e) => repr(e[0]) + ': ' + repr(e[1])).join(', ') + '}';
    if (v instanceof DictView) return 'dict_' + v.kind + '(' + repr(v.list()) + ')';
    if (v instanceof PyRange) return v.step === 1 ? 'range(' + v.start + ', ' + v.stop + ')' : 'range(' + v.start + ', ' + v.stop + ', ' + v.step + ')';
    if (v instanceof PyFunc) return v.isLambda ? '<function <lambda>>' : '<function ' + v.name + '>';
    if (v instanceof Builtin) return '<built-in function ' + v.name + '>';
    if (v instanceof Bound) return '<built-in method ' + v.name + ' of ' + typeName(v.self) + ' object>';
    if (v instanceof PyModule) return "<module '" + v.name + "'>";
    if (v instanceof PyType) return "<class '" + v.name + "'>";
    if (v instanceof PyFile) return "<_io.TextIOWrapper name='" + v.name + "' mode='r' encoding='UTF-8'>";
    if (v instanceof PyIter) return '<' + v.kind + ' object>';
    return '<object>';
  }

  function truthy(v) {
    if (v === null || v === undefined || v === false) return false;
    if (v === true) return true;
    if (typeof v === 'number') return v !== 0;
    if (v instanceof PyFloat) return v.v !== 0;
    if (typeof v === 'string' || Array.isArray(v)) return v.length > 0;
    if (v instanceof Tuple) return v.items.length > 0;
    if (v instanceof PyDict) return v.size > 0;
    if (v instanceof DictView) return v.dict.size > 0;
    if (v instanceof PyRange) return rangeLen(v) > 0;
    return true;
  }

  function rangeLen(r) {
    if (r.step > 0) return Math.max(0, Math.ceil((r.stop - r.start) / r.step));
    return Math.max(0, Math.ceil((r.start - r.stop) / -r.step));
  }

  function toList(v) {
    if (Array.isArray(v)) return v.slice();
    if (typeof v === 'string') return [...v];
    if (v instanceof Tuple) return v.items.slice();
    if (v instanceof PyDict) return v.keys();
    if (v instanceof DictView) return v.list();
    if (v instanceof PyRange) { const out = [], n = rangeLen(v); for (let i = 0; i < n; i++) out.push(v.start + i * v.step); return out; }
    if (v instanceof PyIter) { const out = v.items.slice(v.i); v.i = v.items.length; return out; }
    if (v instanceof PyFile) { const out = v.lines.slice(v.i); v.i = v.lines.length; return out; }
    throw new PyError('TypeError', "'" + typeName(v) + "' object is not iterable");
  }

  function eq(a, b) {
    if (isNum(a) && isNum(b)) return num(a) === num(b);
    if (typeof a === 'string' || typeof b === 'string') return a === b;
    if (a === null || b === null) return a === b;
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => eq(x, b[i]));
    if (a instanceof Tuple && b instanceof Tuple) return a.items.length === b.items.length && a.items.every((x, i) => eq(x, b.items[i]));
    if (a instanceof PyDict && b instanceof PyDict) return a.size === b.size && a.entries().every((e) => b.has(e[0]) && eq(e[1], b.get(e[0])));
    return a === b;
  }

  function cmp(a, b, op) {
    if (isNum(a) && isNum(b)) { const x = num(a), y = num(b); return x < y ? -1 : x > y ? 1 : 0; }
    if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : a > b ? 1 : 0;
    const seq = (x) => (Array.isArray(x) ? x : x instanceof Tuple ? x.items : null);
    const sa = seq(a), sb = seq(b);
    if (sa && sb && Array.isArray(a) === Array.isArray(b)) {
      for (let i = 0; i < Math.min(sa.length, sb.length); i++) { if (!eq(sa[i], sb[i])) return cmp(sa[i], sb[i], op); }
      return sa.length - sb.length;
    }
    throw new PyError('TypeError', "'" + op + "' not supported between instances of '" + typeName(a) + "' and '" + typeName(b) + "'");
  }

  function contains(container, item) {
    if (typeof container === 'string') {
      if (typeof item !== 'string') throw new PyError('TypeError', "'in <string>' requires string as left operand, not " + typeName(item));
      return container.includes(item);
    }
    if (container instanceof PyDict) return container.has(item);
    if (container instanceof DictView && container.kind === 'keys') return container.dict.has(item);
    if (container instanceof PyRange) { if (!isInt(item)) return false; const n = num(item); const k = (n - container.start) / container.step; return Number.isInteger(k) && k >= 0 && k < rangeLen(container); }
    if (Array.isArray(container) || container instanceof Tuple || container instanceof DictView || container instanceof PyIter) return toList(container).some((x) => eq(x, item));
    throw new PyError('TypeError', "argument of type '" + typeName(container) + "' is not iterable");
  }

  function binop(op, a, b) {
    if (isNum(a) && isNum(b)) {
      const fl = a instanceof PyFloat || b instanceof PyFloat;
      const x = num(a), y = num(b);
      switch (op) {
        case '+': return fl ? F(x + y) : x + y;
        case '-': return fl ? F(x - y) : x - y;
        case '*': return fl ? F(x * y) : x * y;
        case '/': if (y === 0) throw new PyError('ZeroDivisionError', fl ? 'float division by zero' : 'division by zero'); return F(x / y);
        case '//': if (y === 0) throw new PyError('ZeroDivisionError', fl ? 'float floor division by zero' : 'integer division or modulo by zero'); return fl ? F(Math.floor(x / y)) : Math.floor(x / y);
        case '%': if (y === 0) throw new PyError('ZeroDivisionError', fl ? 'float modulo by zero' : 'integer modulo by zero'); { const r = x - y * Math.floor(x / y); return fl ? F(r) : r; }
        case '**': if (!fl && y >= 0) return Math.pow(x, y); if (x === 0 && y < 0) throw new PyError('ZeroDivisionError', 'zero to a negative power'); return F(Math.pow(x, y));
      }
    }
    if (op === '+') {
      if (typeof a === 'string' && typeof b === 'string') return a + b;
      if (Array.isArray(a) && Array.isArray(b)) return a.concat(b);
      if (a instanceof Tuple && b instanceof Tuple) return new Tuple(a.items.concat(b.items));
      if (typeof a === 'string') throw new PyError('TypeError', 'can only concatenate str (not "' + typeName(b) + '") to str');
      if (Array.isArray(a)) throw new PyError('TypeError', 'can only concatenate list (not "' + typeName(b) + '") to list');
    }
    if (op === '*') {
      let s = null, n = null;
      if (isInt(b) && (typeof a === 'string' || Array.isArray(a) || a instanceof Tuple)) { s = a; n = num(b); }
      else if (isInt(a) && (typeof b === 'string' || Array.isArray(b) || b instanceof Tuple)) { s = b; n = num(a); }
      if (s !== null) {
        n = Math.max(0, n);
        if (typeof s === 'string') return s.repeat(n);
        const items = Array.isArray(s) ? s : s.items; let out = [];
        for (let i = 0; i < n; i++) out = out.concat(items);
        return Array.isArray(s) ? out : new Tuple(out);
      }
      if (typeof a === 'string' || Array.isArray(a) || a instanceof Tuple) throw new PyError('TypeError', "can't multiply sequence by non-int of type '" + typeName(b) + "'");
    }
    throw new PyError('TypeError', 'unsupported operand type(s) for ' + op + ": '" + typeName(a) + "' and '" + typeName(b) + "'");
  }

  // ---------- format spec (f-strings, format(), str.format) ----------
  function groupThousands(s, sep) {
    const neg = s[0] === '-'; if (neg) s = s.slice(1);
    const [i, f] = s.split('.');
    const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    return (neg ? '-' : '') + g + (f !== undefined ? '.' + f : '');
  }
  // Python rounds the exact binary value, half to even. toFixed(100) shows
  // the exact value for numbers below 1e21, so ties can be found and settled.
  function toFixedPy(x, p) {
    if (!Number.isFinite(x)) return Number.isNaN(x) ? 'nan' : x > 0 ? 'inf' : '-inf';
    if (Math.abs(x) >= 1e21) return x.toFixed(p);
    const neg = x < 0 || Object.is(x, -0);
    const s = Math.abs(x).toFixed(100);
    const [ip, fp] = s.split('.');
    const keep = fp.slice(0, p), rest = fp.slice(p);
    let digits = BigInt(ip + keep);
    const r0 = rest[0];
    const more = /[1-9]/.test(rest.slice(1));
    if (r0 > '5' || (r0 === '5' && (more || digits % 2n === 1n))) digits += 1n;
    let out = digits.toString().padStart(p + 1, '0');
    if (p > 0) out = out.slice(0, out.length - p) + '.' + out.slice(out.length - p);
    return (neg ? '-' : '') + out;
  }
  function formatValue(v, spec) {
    if (!spec) return str(v);
    const m = spec.match(/^(?:(.)?([<>=^]))?([+\- ])?(#)?(0)?(\d+)?([,_])?(?:\.(\d+))?([bcdeEfFgGnosxX%])?$/);
    if (!m) throw new PyError('ValueError', "Invalid format specifier '" + spec + "' for object of type '" + typeName(v) + "'");
    let [, fill, align, sign, , zero, width, group, prec, type] = m;
    let s;
    const numeric = isNum(v);
    if (type && 'deEfFgG%n'.includes(type) && !numeric) throw new PyError('ValueError', "Unknown format code '" + type + "' for object of type '" + typeName(v) + "'");
    if (type === 'd') {
      if (!isInt(v)) throw new PyError('ValueError', "Unknown format code 'd' for object of type '" + typeName(v) + "'");
      s = String(num(v));
    } else if (type === 'f' || type === 'F') s = toFixedPy(num(v), prec === undefined ? 6 : +prec);
    else if (type === '%') s = toFixedPy(num(v) * 100, prec === undefined ? 6 : +prec) + '%';
    else if (type === 'e' || type === 'E') { s = num(v).toExponential(prec === undefined ? 6 : +prec).replace(/e([+-])(\d)$/, 'e$10$2'); if (type === 'E') s = s.toUpperCase(); }
    else if (type === 'g' || type === 'G' || (numeric && prec !== undefined && !type)) {
      const p = prec === undefined ? 6 : Math.max(1, +prec);
      const x = num(v);
      if (x === 0) s = '0';
      else {
        const e = Math.floor(Math.log10(Math.abs(Number(x.toPrecision(p)))));
        if (e < -4 || e >= p) s = x.toExponential(p - 1).replace(/\.?0+e/, 'e').replace(/e([+-])(\d)$/, 'e$10$2');
        else { s = x.toFixed(Math.max(0, p - 1 - e)); if (s.includes('.')) s = s.replace(/\.?0+$/, ''); }
      }
      if (!type && v instanceof PyFloat && !/[.en]/.test(s)) s += '.0';
    } else if (type === 's' || !type) {
      s = str(v);
      if (prec !== undefined && typeof v === 'string') s = s.slice(0, +prec);
    } else s = str(v);
    if (numeric && sign && num(v) >= 0 && s[0] !== '-') s = (sign === ' ' ? ' ' : sign === '+' ? '+' : '') + s;
    if (group && numeric) s = groupThousands(s, group);
    const w = width ? +width : 0;
    if (zero && !align) { fill = '0'; align = '='; }
    if (!align) align = numeric ? '>' : '<';
    fill = fill || ' ';
    if (s.length < w) {
      const pad = w - s.length;
      if (align === '<') s = s + fill.repeat(pad);
      else if (align === '>') s = fill.repeat(pad) + s;
      else if (align === '^') s = fill.repeat(Math.floor(pad / 2)) + s + fill.repeat(Math.ceil(pad / 2));
      else if (align === '=') { const sg = /^[+\- ]/.test(s) ? s[0] : ''; s = sg + fill.repeat(pad) + s.slice(sg.length); }
    }
    return s;
  }

  // ---------- tokenizer ----------
  const KEYWORDS = new Set(['False', 'None', 'True', 'and', 'as', 'break', 'continue', 'def', 'del', 'elif', 'else', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'return', 'while', 'with', 'try', 'except', 'finally', 'raise', 'class', 'assert', 'yield']);
  const OPS = ['**=', '//=', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=', '**', '//', '->', ':=', '+', '-', '*', '/', '%', '<', '>', '=', '(', ')', '[', ']', '{', '}', ',', ':', '.', ';', '@', '&', '|', '^', '~'];
  const OPEN = { '(': ')', '[': ']', '{': '}' };

  function synErr(msg, line, type) { const e = new PyError(type || 'SyntaxError', msg); e.line = line; e.syntax = true; return e; }

  function tokenize(src) {
    const toks = []; const n = src.length; const indents = [0]; const brackets = [];
    let i = 0, line = 1, lineStart = true;
    while (i < n) {
      if (lineStart && brackets.length === 0) {
        let col = 0, j = i;
        while (j < n && (src[j] === ' ' || src[j] === '\t')) { col += src[j] === '\t' ? 8 - (col % 8) : 1; j++; }
        if (j >= n) { i = j; break; }
        if (src[j] === '\n' || src[j] === '\r' || src[j] === '#') {
          while (j < n && src[j] !== '\n') j++;
          i = j + 1; line++; continue;
        }
        if (col > indents[indents.length - 1]) { indents.push(col); toks.push({ t: 'indent', line }); }
        else {
          while (col < indents[indents.length - 1]) { indents.pop(); toks.push({ t: 'dedent', line }); }
          if (col !== indents[indents.length - 1]) throw synErr('unindent does not match any outer indentation level', line, 'IndentationError');
        }
        i = j; lineStart = false;
      }
      const c = src[i];
      if (c === '\n') { if (brackets.length === 0) { toks.push({ t: 'nl', line }); lineStart = true; } i++; line++; continue; }
      if (c === ' ' || c === '\t' || c === '\r' || c === '\f') { i++; continue; }
      if (c === '#') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '\\' && (src[i + 1] === '\n' || (src[i + 1] === '\r' && src[i + 2] === '\n'))) { i += src[i + 1] === '\r' ? 3 : 2; line++; continue; }
      // strings, with optional prefix
      const pm = /^([rRfFbBuU]{0,2})(['"])/.exec(src.slice(i, i + 4));
      if (pm && (pm[1] === '' || /^[a-zA-Z]+$/.test(pm[1])) && (pm[1].length === 0 || !/[A-Za-z0-9_]/.test(src[i - 1] || ''))) {
        const prefix = pm[1].toLowerCase(); const q = pm[2];
        let j = i + pm[1].length; const startLine = line;
        const triple = src.slice(j, j + 3) === q.repeat(3);
        j += triple ? 3 : 1;
        let raw = '';
        for (;;) {
          if (j >= n) throw synErr(triple ? 'unterminated triple-quoted string literal (detected at line ' + line + ')' : 'unterminated string literal (detected at line ' + startLine + ')', startLine);
          const ch = src[j];
          if (!triple && ch === '\n') throw synErr('unterminated string literal (detected at line ' + startLine + ')', startLine);
          if (ch === '\\' && j + 1 < n) { raw += ch + src[j + 1]; if (src[j + 1] === '\n') line++; j += 2; continue; }
          if (triple ? src.slice(j, j + 3) === q.repeat(3) : ch === q) { j += triple ? 3 : 1; break; }
          if (ch === '\n') line++;
          raw += ch; j++;
        }
        const isRaw = prefix.includes('r');
        if (prefix.includes('f')) toks.push({ t: 'fstr', v: raw, raw: isRaw, line: startLine });
        else toks.push({ t: 'str', v: isRaw ? raw : unescape(raw), line: startLine });
        i = j; continue;
      }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
        const m = /^(?:\d[\d_]*)?(?:\.[\d_]*)?(?:[eE][+-]?\d+)?/.exec(src.slice(i));
        let s = m[0];
        if (/^0[xob]/i.test(src.slice(i, i + 2))) { const m2 = /^0[xX][0-9a-fA-F_]+|^0[oO][0-7_]+|^0[bB][01_]+/.exec(src.slice(i)); s = m2[0]; toks.push({ t: 'num', v: parseInt(s.replace(/_/g, '').slice(2), { x: 16, o: 8, b: 2 }[s[1].toLowerCase()]), line }); i += s.length; continue; }
        const isFloat = /[.eE]/.test(s);
        toks.push({ t: 'num', v: isFloat ? F(parseFloat(s.replace(/_/g, ''))) : parseInt(s.replace(/_/g, ''), 10), line });
        i += s.length;
        if (/[A-Za-z_]/.test(src[i] || '')) throw synErr('invalid decimal literal', line);
        continue;
      }
      if (/[A-Za-z_À-￿]/.test(c)) {
        let j = i + 1; while (j < n && /[A-Za-z0-9_À-￿]/.test(src[j])) j++;
        const w = src.slice(i, j);
        toks.push({ t: KEYWORDS.has(w) ? 'kw' : 'name', v: w, line });
        i = j; continue;
      }
      const op = OPS.find((o) => src.startsWith(o, i));
      if (!op) throw synErr("invalid character '" + c + "' (U+" + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0') + ')', line);
      if (OPEN[op]) brackets.push({ op, line });
      else if (op === ')' || op === ']' || op === '}') {
        const top = brackets.pop();
        if (!top) throw synErr("unmatched '" + op + "'", line);
        if (OPEN[top.op] !== op) throw synErr("closing parenthesis '" + op + "' does not match opening parenthesis '" + top.op + "'" + (top.line !== line ? ' on line ' + top.line : ''), line);
      }
      toks.push({ t: 'op', v: op, line });
      i += op.length;
    }
    if (brackets.length) { const b = brackets[brackets.length - 1]; throw synErr("'" + b.op + "' was never closed", b.line); }
    if (toks.length && toks[toks.length - 1].t !== 'nl' && toks[toks.length - 1].t !== 'dedent') toks.push({ t: 'nl', line });
    while (indents.length > 1) { indents.pop(); toks.push({ t: 'dedent', line }); }
    toks.push({ t: 'eof', line });
    return toks;
  }

  function unescape(s) {
    return s.replace(/\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|N\{[^}]*\}|\n|[\\'"abfnrtv0])/g, (m, e) => {
      if (e[0] === 'x' || e[0] === 'u') return String.fromCharCode(parseInt(e.slice(1), 16));
      return { '\\': '\\', "'": "'", '"': '"', a: '\x07', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v', '0': '\0', '\n': '' }[e] ?? m;
    });
  }

  // ---------- parser ----------
  function parse(src) {
    const toks = tokenize(src);
    let p = 0;
    const peek = (o = 0) => toks[p + o];
    const at = (t, v) => { const k = toks[p]; return k.t === t && (v === undefined || k.v === v); };
    const atOp = (v) => at('op', v);
    const atKw = (v) => at('kw', v);
    const next = () => toks[p++];
    const fail = (msg, tok) => { throw synErr(msg || 'invalid syntax', (tok || toks[p]).line); };
    const expectOp = (v, msg) => { if (!atOp(v)) fail(msg || (v === ':' ? "expected ':'" : 'invalid syntax')); return next(); };
    const expectName = () => { if (!at('name')) fail(); return next().v; };

    function program() {
      const body = [];
      while (!at('eof')) body.push(...statement());
      return body;
    }

    function block(kind, line) {
      expectOp(':');
      if (!at('nl')) { return simpleLine(); }
      next();
      if (!at('indent')) throw synErr('expected an indented block after ' + kind + ' on line ' + line, toks[p].line, 'IndentationError');
      next();
      const body = [];
      while (!at('dedent') && !at('eof')) body.push(...statement());
      if (at('dedent')) next();
      return body;
    }

    function statement() {
      const t = peek();
      if (t.t === 'indent') throw synErr('unexpected indent', t.line, 'IndentationError');
      if (t.t === 'nl') { next(); return []; }
      if (t.t === 'kw') {
        switch (t.v) {
          case 'if': return [ifStmt()];
          case 'while': { next(); const test = expr(); if (atOp('=')) fail("invalid syntax. Maybe you meant '==' or ':=' instead of '='?"); const body = block("'while' statement", t.line); let orelse = []; if (atKw('else')) { const e = next(); orelse = block("'else' statement", e.line); } return [{ k: 'While', test, body, orelse, line: t.line }]; }
          case 'for': { next(); const target = targetList(); if (!atKw('in')) fail("invalid syntax"); next(); const iter = exprList(); const body = block("'for' statement", t.line); let orelse = []; if (atKw('else')) { const e = next(); orelse = block("'else' statement", e.line); } return [{ k: 'For', target, iter, body, orelse, line: t.line }]; }
          case 'def': return [defStmt()];
          case 'with': {
            next(); const items = [];
            do { const ctx = expr(); let name = null; if (atKw('as')) { next(); name = target(); } items.push({ ctx, name }); } while (atOp(',') && next());
            const body = block("'with' statement", t.line);
            return [{ k: 'With', items, body, line: t.line }];
          }
          case 'try': return [tryStmt()];
          case 'class': fail('classes are not supported on this page');
        }
      }
      return simpleLine();
    }

    function simpleLine() {
      const out = [simple()];
      while (atOp(';')) { next(); if (at('nl')) break; out.push(simple()); }
      if (!at('nl') && !at('eof')) {
        const prev = toks[p - 1];
        if (prev && prev.t === 'name' && prev.v === 'print' && (at('str') || at('name') || at('num'))) fail("Missing parentheses in call to 'print'. Did you mean print(...)?");
        fail('invalid syntax');
      }
      if (at('nl')) next();
      return out;
    }

    function ifStmt() {
      const t = next();
      const test = expr();
      if (atOp('=')) fail("invalid syntax. Maybe you meant '==' or ':=' instead of '='?");
      const body = block("'" + t.v + "' statement", t.line);
      let orelse = [];
      if (atKw('elif')) orelse = [ifStmt()];
      else if (atKw('else')) { const e = next(); orelse = block("'else' statement", e.line); }
      return { k: 'If', test, body, orelse, line: t.line };
    }

    function defStmt() {
      const t = next();
      const name = expectName();
      expectOp('(', "expected '('");
      const params = paramList(')');
      expectOp(')');
      if (atOp('->')) { next(); expr(); }
      const body = block("function definition", t.line);
      return { k: 'Def', name, params, body, line: t.line };
    }

    function paramList(close) {
      const params = []; let seenDefault = false;
      while (!atOp(close)) {
        if (atOp('*') || atOp('**')) fail('*args and **kwargs are not supported on this page');
        const name = expectName(); let def = null;
        if (atOp(':') && close === ')') { next(); expr(); }
        if (atOp('=')) { next(); def = expr(); seenDefault = true; }
        else if (seenDefault) fail('parameter without a default follows parameter with a default');
        params.push({ name, def });
        if (!atOp(',')) break; next();
      }
      return params;
    }

    function tryStmt() {
      const t = next();
      const body = block("'try' statement", t.line);
      const handlers = []; let orelse = [], fin = [];
      while (atKw('except')) {
        const e = next(); let type = null, name = null;
        if (!atOp(':')) { type = expr(); if (atKw('as')) { next(); name = expectName(); } }
        handlers.push({ type, name, body: block("'except' statement", e.line) });
      }
      if (atKw('else')) { const e = next(); orelse = block("'else' statement", e.line); }
      if (atKw('finally')) { const e = next(); fin = block("'finally' statement", e.line); }
      if (!handlers.length && !fin.length) fail("expected 'except' or 'finally' block");
      return { k: 'Try', body, handlers, orelse, fin, line: t.line };
    }

    function simple() {
      const t = peek();
      if (t.t === 'kw') {
        switch (t.v) {
          case 'pass': next(); return { k: 'Pass', line: t.line };
          case 'break': next(); return { k: 'Break', line: t.line };
          case 'continue': next(); return { k: 'Continue', line: t.line };
          case 'return': next(); return { k: 'Return', value: at('nl') || atOp(';') || at('eof') ? null : exprList(), line: t.line };
          case 'global': case 'nonlocal': { next(); const names = [expectName()]; while (atOp(',')) { next(); names.push(expectName()); } return { k: 'Global', names, line: t.line }; }
          case 'import': {
            next(); const items = [];
            do { let name = expectName(); while (atOp('.')) { next(); name += '.' + expectName(); } let as = null; if (atKw('as')) { next(); as = expectName(); } items.push({ name, as }); } while (atOp(',') && next());
            return { k: 'Import', items, line: t.line };
          }
          case 'from': {
            next(); let mod = expectName(); while (atOp('.')) { next(); mod += '.' + expectName(); }
            if (!atKw('import')) fail(); next();
            const names = [];
            const paren = atOp('('); if (paren) next();
            if (atOp('*')) { next(); names.push({ name: '*', as: null }); }
            else do { const name = expectName(); let as = null; if (atKw('as')) { next(); as = expectName(); } names.push({ name, as }); } while (atOp(',') && next() && !atOp(')'));
            if (paren) expectOp(')');
            return { k: 'From', mod, names, line: t.line };
          }
          case 'del': { next(); const targets = [target()]; while (atOp(',')) { next(); targets.push(target()); } return { k: 'Del', targets, line: t.line }; }
          case 'raise': { next(); return { k: 'Raise', exc: at('nl') ? null : expr(), line: t.line }; }
          case 'assert': { next(); const test = expr(); let msg = null; if (atOp(',')) { next(); msg = expr(); } return { k: 'Assert', test, msg, line: t.line }; }
        }
      }
      const first = exprList();
      if (atOp('=')) {
        const targets = [first];
        let value;
        for (;;) { next(); const e = exprList(); if (atOp('=')) targets.push(e); else { value = e; break; } }
        targets.forEach(checkTarget);
        return { k: 'Assign', targets, value, line: t.line };
      }
      const aug = ['+=', '-=', '*=', '/=', '//=', '%=', '**='].find((o) => atOp(o));
      if (aug) { next(); checkTarget(first); if (first.k === 'Tuple') fail("'tuple' is an illegal expression for augmented assignment"); return { k: 'AugAssign', target: first, op: aug.slice(0, -1), value: exprList(), line: t.line }; }
      return { k: 'Expr', value: first, line: t.line };
    }

    function checkTarget(e) {
      if (e.k === 'Name' || e.k === 'Subscript' || e.k === 'Attr') return;
      if (e.k === 'Tuple' || e.k === 'List') { e.items.forEach(checkTarget); return; }
      if (e.k === 'Call') throw synErr("cannot assign to function call here. Maybe you meant '==' instead of '='?", e.line);
      if (e.k === 'Const' || e.k === 'Str') throw synErr("cannot assign to literal here. Maybe you meant '==' instead of '='?", e.line);
      throw synErr('cannot assign to expression here. Maybe you meant \'==\' instead of \'=\'?', e.line);
    }

    function target() { const e = postfix(); checkTarget(e); return e; }
    function targetList() {
      const line = peek().line;
      const first = target();
      if (!atOp(',')) return first;
      const items = [first];
      while (atOp(',')) { next(); if (atKw('in') || atOp('=')) break; items.push(target()); }
      return { k: 'Tuple', items, line };
    }

    function exprList() {
      const line = peek().line;
      const first = expr();
      if (!atOp(',')) return first;
      const items = [first];
      while (atOp(',')) { next(); if (at('nl') || atOp('=') || atOp(')') || atOp(';') || at('eof')) break; items.push(expr()); }
      return { k: 'Tuple', items, line };
    }

    function expr() {
      if (atKw('lambda')) {
        const t = next(); const params = paramList(':'); expectOp(':');
        return { k: 'Lambda', params, body: expr(), line: t.line };
      }
      const e = orExpr();
      if (atKw('if')) {
        const t = next(); const test = orExpr();
        if (!atKw('else')) fail("expected 'else' after 'if' expression");
        next(); const orelse = expr();
        return { k: 'IfExp', test, body: e, orelse, line: t.line };
      }
      return e;
    }
    function orExpr() { let e = andExpr(); while (atKw('or')) { const t = next(); e = { k: 'Bool', op: 'or', a: e, b: andExpr(), line: t.line }; } return e; }
    function andExpr() { let e = notExpr(); while (atKw('and')) { const t = next(); e = { k: 'Bool', op: 'and', a: e, b: notExpr(), line: t.line }; } return e; }
    function notExpr() { if (atKw('not')) { const t = next(); return { k: 'Not', v: notExpr(), line: t.line }; } return comparison(); }
    function comparison() {
      const first = arith();
      const ops = [], rest = [];
      for (;;) {
        let op = null;
        if (['<', '>', '==', '!=', '<=', '>='].some((o) => atOp(o))) op = next().v;
        else if (atKw('in')) { next(); op = 'in'; }
        else if (atKw('not') && peek(1).t === 'kw' && peek(1).v === 'in') { next(); next(); op = 'not in'; }
        else if (atKw('is')) { next(); if (atKw('not')) { next(); op = 'is not'; } else op = 'is'; }
        if (!op) break;
        ops.push(op); rest.push(arith());
      }
      return ops.length ? { k: 'Compare', first, ops, rest, line: first.line } : first;
    }
    function arith() { let e = term(); while (atOp('+') || atOp('-')) { const t = next(); e = { k: 'Bin', op: t.v, a: e, b: term(), line: t.line }; } return e; }
    function term() { let e = unary(); while (atOp('*') || atOp('/') || atOp('//') || atOp('%')) { const t = next(); e = { k: 'Bin', op: t.v, a: e, b: unary(), line: t.line }; } return e; }
    function unary() { if (atOp('-') || atOp('+')) { const t = next(); return { k: 'Unary', op: t.v, v: unary(), line: t.line }; } return power(); }
    function power() { const e = postfix(); if (atOp('**')) { const t = next(); return { k: 'Bin', op: '**', a: e, b: unary(), line: t.line }; } return e; }

    function postfix() {
      let e = atom();
      for (;;) {
        if (atOp('(')) {
          const t = next(); const args = [], kwargs = [];
          while (!atOp(')')) {
            if (at('name') && peek(1).t === 'op' && peek(1).v === '=') { const name = next().v; next(); kwargs.push({ name, value: expr() }); }
            else { if (kwargs.length) fail('positional argument follows keyword argument'); const a = expr(); if (atKw('for')) args.push(comprehension(a, 'Gen', t.line)); else args.push(a); }
            if (!atOp(',')) break; next();
          }
          expectOp(')');
          e = { k: 'Call', fn: e, args, kwargs, line: t.line };
        } else if (atOp('[')) {
          const t = next(); const idx = subscript(); expectOp(']');
          e = { k: 'Subscript', v: e, idx, line: t.line };
        } else if (atOp('.')) {
          const t = next(); e = { k: 'Attr', v: e, name: expectName(), line: t.line };
        } else return e;
      }
    }

    function subscript() {
      const line = peek().line;
      let lo = null, hi = null, st = null;
      if (!atOp(':')) { lo = expr(); if (!atOp(':')) { if (atOp(',')) { const items = [lo]; while (atOp(',')) { next(); if (atOp(']')) break; items.push(expr()); } return { k: 'Tuple', items, line }; } return lo; } }
      next();
      if (!atOp(']') && !atOp(':')) hi = expr();
      if (atOp(':')) { next(); if (!atOp(']')) st = expr(); }
      return { k: 'Slice', lo, hi, st, line };
    }

    function comprehension(elt, kind, line, val) {
      const gens = [];
      while (atKw('for')) {
        next(); const target = targetList(); if (!atKw('in')) fail(); next();
        const iter = orExpr(); const ifs = [];
        while (atKw('if')) { next(); ifs.push(orExpr()); }
        gens.push({ target, iter, ifs });
      }
      return { k: 'Comp', kind, elt, val, gens, line };
    }

    function atom() {
      const t = peek();
      if (t.t === 'name') { next(); return { k: 'Name', id: t.v, line: t.line }; }
      if (t.t === 'num') { next(); return { k: 'Const', v: t.v, line: t.line }; }
      if (t.t === 'str' || t.t === 'fstr') {
        const parts = [];
        while (at('str') || at('fstr')) { const s = next(); parts.push(s.t === 'str' ? { k: 'Str', v: s.v, line: s.line } : fstring(s)); }
        if (parts.length === 1) return parts[0];
        return { k: 'Concat', parts, line: t.line };
      }
      if (t.t === 'kw') {
        if (t.v === 'True') { next(); return { k: 'Const', v: true, line: t.line }; }
        if (t.v === 'False') { next(); return { k: 'Const', v: false, line: t.line }; }
        if (t.v === 'None') { next(); return { k: 'Const', v: null, line: t.line }; }
      }
      if (t.t === 'op') {
        if (t.v === '(') {
          next();
          if (atOp(')')) { next(); return { k: 'Tuple', items: [], line: t.line }; }
          const first = expr();
          if (atKw('for')) { const c = comprehension(first, 'Gen', t.line); expectOp(')'); return c; }
          if (atOp(')')) { next(); return first; }
          const items = [first];
          while (atOp(',')) { next(); if (atOp(')')) break; items.push(expr()); }
          expectOp(')');
          return { k: 'Tuple', items, line: t.line };
        }
        if (t.v === '[') {
          next(); const items = [];
          if (atOp(']')) { next(); return { k: 'List', items, line: t.line }; }
          const first = expr();
          if (atKw('for')) { const c = comprehension(first, 'List', t.line); expectOp(']'); return c; }
          items.push(first);
          while (atOp(',')) { next(); if (atOp(']')) break; items.push(expr()); }
          expectOp(']');
          return { k: 'List', items, line: t.line };
        }
        if (t.v === '{') {
          next(); const keys = [], vals = [];
          if (atOp('}')) { next(); return { k: 'Dict', keys, vals, line: t.line }; }
          const k0 = expr();
          if (!atOp(':')) fail('sets are not supported on this page');
          next(); const v0 = expr();
          if (atKw('for')) { const c = comprehension(k0, 'Dict', t.line, v0); expectOp('}'); return c; }
          keys.push(k0); vals.push(v0);
          while (atOp(',')) { next(); if (atOp('}')) break; keys.push(expr()); expectOp(':'); vals.push(expr()); }
          expectOp('}');
          return { k: 'Dict', keys, vals, line: t.line };
        }
      }
      if (t.t === 'nl' || t.t === 'eof') fail('invalid syntax');
      if (t.t === 'indent') throw synErr('unexpected indent', t.line, 'IndentationError');
      fail('invalid syntax');
    }

    function fstring(tok) {
      const s = tok.v, parts = []; let i = 0, lit = '';
      const pushLit = () => { if (lit) { parts.push({ k: 'Str', v: tok.raw ? lit : unescape(lit) }); lit = ''; } };
      while (i < s.length) {
        const c = s[i];
        if (c === '{' && s[i + 1] === '{') { lit += '{'; i += 2; continue; }
        if (c === '}' && s[i + 1] === '}') { lit += '}'; i += 2; continue; }
        if (c === '}') throw synErr("f-string: single '}' is not allowed", tok.line);
        if (c !== '{') { lit += c; i++; continue; }
        pushLit();
        let j = i + 1, depth = 0, quote = null;
        let exprEnd = -1, conv = null, specStart = -1;
        for (; j < s.length; j++) {
          const d = s[j];
          if (quote) { if (d === quote) quote = null; continue; }
          if (d === "'" || d === '"') { quote = d; continue; }
          if ('([{'.includes(d)) depth++;
          else if (')]'.includes(d) || (d === '}' && depth > 0)) depth--;
          else if (depth === 0 && d === '}') break;
          else if (depth === 0 && d === '!' && s[j + 1] !== '=' && exprEnd < 0) { exprEnd = j; conv = s[j + 1]; j++; }
          else if (depth === 0 && d === ':' && specStart < 0) { if (exprEnd < 0) exprEnd = j; specStart = j + 1; break; }
        }
        let specEnd = j;
        if (specStart >= 0) { specEnd = s.indexOf('}', specStart); if (specEnd < 0) throw synErr("f-string: expecting '}'", tok.line); }
        else if (j >= s.length) throw synErr("f-string: expecting '}'", tok.line);
        if (exprEnd < 0) exprEnd = j;
        let src = s.slice(i + 1, exprEnd);
        let selfDoc = null;
        if (/=\s*$/.test(src) && !/[=!<>]=\s*$/.test(src)) { selfDoc = src; src = src.replace(/=\s*$/, ''); }
        if (!src.trim()) throw synErr('f-string: valid expression required before \'}\'', tok.line);
        let e;
        try { e = parseExpr(src, tok.line); } catch (err) { if (err instanceof PyError) { err.line = tok.line; } throw err; }
        if (selfDoc) parts.push({ k: 'Str', v: selfDoc });
        parts.push({ k: 'FVal', e, conv: conv || (selfDoc && specStart < 0 ? 'r' : null), spec: specStart >= 0 ? s.slice(specStart, specEnd) : '', line: tok.line });
        i = specEnd + 1;
      }
      pushLit();
      return { k: 'FStr', parts, line: tok.line };
    }

    return { program, expr: () => { const e = exprList(); while (at('nl')) next(); if (!at('eof')) fail(); return e; } };
  }

  function parseExpr(src, line) {
    const ps = parse('(' + src + ')');
    const e = ps.expr();
    const fix = (n) => { if (n && typeof n === 'object') { if (typeof n.line === 'number') n.line = line; for (const k in n) if (k !== 'line') { const c = n[k]; if (Array.isArray(c)) c.forEach(fix); else if (c && typeof c === 'object' && c.k) fix(c); } } };
    fix(e);
    return e;
  }

  // names a function assigns to are its locals (unless declared global)
  function localNames(params, body) {
    const names = new Set(params.map((p) => p.name)); const globals = new Set();
    const addTarget = (t) => { if (t.k === 'Name') names.add(t.id); else if (t.k === 'Tuple' || t.k === 'List') t.items.forEach(addTarget); };
    const walk = (stmts) => {
      for (const s of stmts) {
        switch (s.k) {
          case 'Assign': s.targets.forEach(addTarget); break;
          case 'AugAssign': addTarget(s.target); break;
          case 'For': addTarget(s.target); walk(s.body); walk(s.orelse); break;
          case 'While': walk(s.body); walk(s.orelse); break;
          case 'If': walk(s.body); walk(s.orelse); break;
          case 'With': s.items.forEach((it) => it.name && addTarget(it.name)); walk(s.body); break;
          case 'Try': walk(s.body); s.handlers.forEach((h) => { if (h.name) names.add(h.name); walk(h.body); }); walk(s.orelse); walk(s.fin); break;
          case 'Def': names.add(s.name); break;
          case 'Import': s.items.forEach((it) => names.add(it.as || it.name.split('.')[0])); break;
          case 'From': s.names.forEach((it) => names.add(it.as || it.name)); break;
          case 'Global': s.names.forEach((n) => globals.add(n)); break;
          case 'Del': s.targets.forEach(addTarget); break;
        }
      }
    };
    walk(body);
    globals.forEach((g) => names.delete(g));
    return names;
  }

  // ---------- interpreter ----------
  class Interp {
    constructor(opts) {
      this.opts = opts || {};
      this.files = Object.assign({}, this.opts.files || {});
      this.out = this.opts.out || (() => {});
      this.reset();
    }

    reset() {
      this.globals = new Map();
      this.globals.set('__name__', '__main__');
      this.figure = null;
    }

    // Run a program. Resolves to null, or to the error text if it failed.
    async run(src, filename) {
      this.filename = filename || 'main.py';
      this.src = src.split('\n');
      this.stopped = false;
      this.steps = 0;
      this.stack = [{ name: '<module>', line: 0, file: this.filename, src: this.src }];
      let ast;
      try { ast = parse(src).program(); }
      catch (e) { if (e instanceof PyError) return this.report(e); throw e; }
      const gen = this.execBlock(ast, null);
      let send;
      try {
        for (;;) {
          const r = gen.next(send);
          send = undefined;
          if (r.done) break;
          const req = r.value;
          if (req.input !== undefined) {
            send = await this.opts.input(req.input);
            if (this.stopped) throw new PyError('KeyboardInterrupt', '');
          } else if (req.tick) {
            await new Promise((res) => setTimeout(res, 0));
            if (this.stopped) throw new PyError('KeyboardInterrupt', '');
          }
        }
        if (this.figure) this.showFigure();
        return null;
      } catch (e) {
        try { gen.return(); } catch (_) { /* already finished */ }
        if (this.figure) this.showFigure();
        if (e instanceof PyError && e.type === 'SystemExit') return null;
        if (e instanceof PyError && e.type === 'KeyboardInterrupt') { this.out('\nProgram stopped.\n', 'err'); return 'stopped'; }
        if (e instanceof PyError) return this.report(e);
        if (e instanceof RangeError) return this.report(Object.assign(new PyError('RecursionError', 'maximum recursion depth exceeded'), { frames: this.stack.slice() }));
        throw e;
      }
    }

    stop() { this.stopped = true; }

    report(e) {
      let text;
      if (e.syntax) {
        const src = (this.src[e.line - 1] || '').trim();
        text = '  File "' + this.filename + '", line ' + e.line + '\n' + (src ? '    ' + src + '\n' : '') + e.type + ': ' + e.msg + '\n';
      } else {
        const frames = e.frames || this.stack;
        text = 'Traceback (most recent call last):\n';
        for (const f of frames) {
          text += '  File "' + f.file + '", line ' + f.line + ', in ' + f.name + '\n';
          const src = (f.src[f.line - 1] || '').trim();
          if (src) text += '    ' + src + '\n';
        }
        text += e.type + (e.msg !== '' && e.msg !== undefined ? ': ' + e.msg : '') + '\n';
      }
      this.out(text, 'err');
      return text;
    }

    err(type, msg) { return new PyError(type, msg); }

    // ----- statements -----
    *execBlock(stmts, scope) {
      for (const s of stmts) {
        const r = yield* this.exec(s, scope);
        if (r) return r;
      }
      return null;
    }

    *exec(s, scope) {
      const frame = this.stack[this.stack.length - 1];
      frame.line = s.line;
      if (++this.steps % 5000 === 0) yield { tick: true };
      if (this.steps > 20000000) throw new PyError('RuntimeError', 'this page stopped the program after 20 million steps. Is there a loop that never ends?');
      try {
        switch (s.k) {
          case 'Expr': yield* this.eval(s.value, scope); return null;
          case 'Assign': {
            const v = yield* this.eval(s.value, scope);
            for (const t of s.targets) yield* this.assign(t, v, scope);
            return null;
          }
          case 'AugAssign': {
            const t = s.target;
            if (t.k === 'Name') { const cur = this.lookup(t.id, scope); const v = yield* this.eval(s.value, scope); this.store(t.id, this.augOp(s.op, cur, v), scope); }
            else if (t.k === 'Subscript') {
              const obj = yield* this.eval(t.v, scope); const idx = yield* this.eval(t.idx, scope);
              const cur = this.getItem(obj, idx); const v = yield* this.eval(s.value, scope);
              this.setItem(obj, idx, this.augOp(s.op, cur, v));
            } else throw this.err('SyntaxError', 'invalid target');
            return null;
          }
          case 'If': {
            const v = yield* this.eval(s.test, scope);
            return yield* this.execBlock(truthy(v) ? s.body : s.orelse, scope);
          }
          case 'While': {
            for (;;) {
              frame.line = s.line;
              const v = yield* this.eval(s.test, scope);
              if (!truthy(v)) return yield* this.execBlock(s.orelse, scope);
              const r = yield* this.execBlock(s.body, scope);
              if (r === BREAK) return null;
              if (r && r !== CONTINUE) return r;
              if (++this.steps % 5000 === 0) yield { tick: true };
            }
          }
          case 'For': {
            const it = yield* this.eval(s.iter, scope);
            const items = Array.isArray(it) ? it : this.iterate(it); // a list is read live, as in Python
            for (let i = 0; i < items.length; i++) {
              yield* this.assign(s.target, items[i], scope);
              const r = yield* this.execBlock(s.body, scope);
              if (r === BREAK) return null;
              if (r && r !== CONTINUE) return r;
              if (++this.steps % 5000 === 0) yield { tick: true };
            }
            return yield* this.execBlock(s.orelse, scope);
          }
          case 'Break': return BREAK;
          case 'Continue': return CONTINUE;
          case 'Pass': return null;
          case 'Return': {
            if (!scope) throw this.synAt("'return' outside function", s.line);
            return { sig: 'return', value: s.value ? yield* this.eval(s.value, scope) : null };
          }
          case 'Def': {
            const defs = [];
            for (const p of s.params) defs.push({ name: p.name, def: p.def ? yield* this.eval(p.def, scope) : undefined, hasDef: !!p.def });
            const fn = new PyFunc(s.name, defs, s.body, scope, s.line); fn.file = this.filename; fn.src = this.src;
            this.store(s.name, fn, scope);
            return null;
          }
          case 'Global': { if (scope) s.names.forEach((n) => scope.globalNames.add(n)); return null; }
          case 'Import': {
            for (const it of s.items) {
              const mod = this.module(it.name);
              if (it.as) this.store(it.as, mod, scope);
              else this.store(it.name.split('.')[0], it.name.includes('.') ? this.module(it.name.split('.')[0]) : mod, scope);
            }
            return null;
          }
          case 'From': {
            const mod = this.module(s.mod);
            for (const it of s.names) {
              if (it.name === '*') { for (const k in mod.attrs) this.store(k, mod.attrs[k], scope); continue; }
              if (!(it.name in mod.attrs)) throw this.err('ImportError', "cannot import name '" + it.name + "' from '" + s.mod + "'");
              this.store(it.as || it.name, mod.attrs[it.name], scope);
            }
            return null;
          }
          case 'With': {
            const opened = [];
            try {
              for (const it of s.items) {
                const v = yield* this.eval(it.ctx, scope); opened.push(v);
                if (it.name) yield* this.assign(it.name, v, scope);
              }
              return yield* this.execBlock(s.body, scope);
            } finally { opened.forEach((v) => { if (v instanceof PyFile) v.closed = true; }); }
          }
          case 'Try': {
            let r = null;
            const depth = this.stack.length;
            try {
              try { r = yield* this.execBlock(s.body, scope); }
              catch (e) {
                if (!(e instanceof PyError) || e.type === 'KeyboardInterrupt') throw e;
                this.stack.length = depth;
                let handled = false;
                for (const h of s.handlers) {
                  let match = !h.type;
                  if (h.type) {
                    const tv = yield* this.eval(h.type, scope);
                    const types = tv instanceof Tuple ? tv.items : [tv];
                    match = types.some((t) => t instanceof PyType && excMatches(e.type, t.name));
                  }
                  if (match) { if (h.name) this.store(h.name, e.msg, scope); r = yield* this.execBlock(h.body, scope); handled = true; break; }
                }
                if (!handled) throw e;
                return r;
              }
              if (!r) r = yield* this.execBlock(s.orelse, scope);
              return r;
            } finally {
              if (s.fin.length) { const f = yield* this.execBlock(s.fin, scope); if (f) return f; }
            }
          }
          case 'Del': {
            for (const t of s.targets) {
              if (t.k === 'Subscript') {
                const obj = yield* this.eval(t.v, scope); const idx = yield* this.eval(t.idx, scope);
                if (obj instanceof PyDict) { if (!obj.del(idx)) throw this.err('KeyError', repr(idx)); }
                else if (Array.isArray(obj)) { const i = this.index(obj, idx, 'list'); obj.splice(i, 1); }
                else throw this.err('TypeError', "'" + typeName(obj) + "' object doesn't support item deletion");
              } else if (t.k === 'Name') { const vars = scope && !scope.globalNames.has(t.id) ? scope.vars : this.globals; if (!vars.delete(t.id)) throw this.err('NameError', "name '" + t.id + "' is not defined"); }
            }
            return null;
          }
          case 'Raise': {
            if (!s.exc) throw this.err('RuntimeError', 'No active exception to reraise');
            let v = yield* this.eval(s.exc, scope);
            if (v instanceof PyType) throw this.err(v.name, '');
            if (v && v.excType) throw this.err(v.excType, v.msg);
            throw this.err('TypeError', 'exceptions must derive from BaseException');
          }
          case 'Assert': {
            const v = yield* this.eval(s.test, scope);
            if (!truthy(v)) throw this.err('AssertionError', s.msg ? str(yield* this.eval(s.msg, scope)) : '');
            return null;
          }
        }
        throw this.err('SyntaxError', 'unsupported statement');
      } catch (e) {
        if (e instanceof PyError && !e.frames) e.frames = this.stack.map((f) => Object.assign({}, f));
        throw e;
      }
    }

    synAt(msg, line) { const e = new PyError('SyntaxError', msg); e.syntax = true; e.line = line; return e; }

    augOp(op, a, b) {
      if (op === '+' && Array.isArray(a)) { if (!Array.isArray(b) && !(b instanceof Tuple) && typeof b !== 'string' && !(b instanceof PyRange) && !(b instanceof PyDict)) throw this.err('TypeError', "'" + typeName(b) + "' object is not iterable"); a.push(...toList(b)); return a; }
      return binop(op, a, b);
    }

    *assign(t, v, scope) {
      if (t.k === 'Name') { this.store(t.id, v, scope); return; }
      if (t.k === 'Subscript') {
        const obj = yield* this.eval(t.v, scope); const idx = yield* this.eval(t.idx, scope);
        this.setItem(obj, idx, v); return;
      }
      if (t.k === 'Tuple' || t.k === 'List') {
        const items = this.iterate(v);
        if (items.length > t.items.length) throw this.err('ValueError', 'too many values to unpack (expected ' + t.items.length + ')');
        if (items.length < t.items.length) throw this.err('ValueError', 'not enough values to unpack (expected ' + t.items.length + ', got ' + items.length + ')');
        for (let i = 0; i < items.length; i++) yield* this.assign(t.items[i], items[i], scope);
        return;
      }
      if (t.k === 'Attr') throw this.err('AttributeError', "'" + typeName(yield* this.eval(t.v, scope)) + "' object attribute '" + t.name + "' is read-only");
      throw this.err('SyntaxError', 'cannot assign');
    }

    store(name, v, scope) {
      if (scope && !scope.globalNames.has(name)) scope.vars.set(name, v);
      else this.globals.set(name, v);
    }

    lookup(name, scope) {
      if (scope) {
        if (scope.vars.has(name)) return scope.vars.get(name);
        if (scope.fn.locals.has(name) && !scope.globalNames.has(name)) throw this.err('UnboundLocalError', "cannot access local variable '" + name + "' where it is not associated with a value");
        for (let s = scope.fn.closure; s; s = s.fn.closure) if (s.vars.has(name)) return s.vars.get(name);
      }
      if (this.globals.has(name)) return this.globals.get(name);
      if (hasOwn(BUILTINS, name)) return BUILTINS[name];
      let msg = "name '" + name + "' is not defined";
      const cands = new Set([...this.globals.keys(), ...Object.keys(BUILTINS)]);
      if (scope) { for (const k of scope.vars.keys()) cands.add(k); }
      const hint = suggest(name, [...cands]);
      if (hint) msg += ". Did you mean: '" + hint + "'?";
      throw this.err('NameError', msg);
    }

    module(name) {
      const m = hasOwn(MODULES, name) ? MODULES[name] : null;
      if (!m) throw this.err('ModuleNotFoundError', "No module named '" + name + "'" + (name === 'pandas' || name === 'numpy' ? ' (this page has csv and matplotlib.pyplot; use Colab for ' + name + ')' : ''));
      return m(this);
    }

    iterate(v) {
      if (v instanceof PyIter) { const out = v.items.slice(v.i); v.i = v.items.length; return out; }
      if (v instanceof PyFile) { if (v.closed) throw this.err('ValueError', 'I/O operation on closed file.'); const out = v.lines.slice(v.i); v.i = v.lines.length; return out; }
      return toList(v);
    }

    index(seq, idx, kind) {
      if (!isInt(idx)) throw this.err('TypeError', kind + ' indices must be integers or slices, not ' + typeName(idx));
      const len = seq.length; let i = num(idx);
      if (i < 0) i += len;
      if (i < 0 || i >= len) throw this.err('IndexError', kind + ' index out of range');
      return i;
    }

    slice(seq, sl) {
      const len = seq.length;
      const step = sl.st === null ? 1 : num(sl.st);
      if (step === 0) throw this.err('ValueError', 'slice step cannot be zero');
      const norm = (v, def, lo, hi) => { if (v === null) return def; let i = num(v); if (i < 0) i += len; return Math.min(Math.max(i, lo), hi); };
      const out = [];
      if (step > 0) { const a = norm(sl.lo, 0, 0, len), b = norm(sl.hi, len, 0, len); for (let i = a; i < b; i += step) out.push(seq[i]); }
      else { const a = norm(sl.lo, len - 1, -1, len - 1), b = norm(sl.hi, -1, -1, len - 1); for (let i = a; i > b; i += step) out.push(seq[i]); }
      return out;
    }

    getItem(obj, idx) {
      if (idx && idx.slice === true) {
        if (typeof obj === 'string') return this.slice([...obj], idx).join('');
        if (Array.isArray(obj)) return this.slice(obj, idx);
        if (obj instanceof Tuple) return new Tuple(this.slice(obj.items, idx));
        if (obj instanceof PyRange) return this.slice(toList(obj), idx);
      }
      if (Array.isArray(obj)) return obj[this.index(obj, idx, 'list')];
      if (typeof obj === 'string') { const ch = [...obj]; return ch[this.index(ch, idx, 'string')]; }
      if (obj instanceof Tuple) return obj.items[this.index(obj.items, idx, 'tuple')];
      if (obj instanceof PyRange) { const l = toList(obj); return l[this.index(l, idx, 'range object')]; }
      if (obj instanceof PyDict) { const v = obj.get(idx); if (v === undefined) throw this.err('KeyError', repr(idx)); return v; }
      throw this.err('TypeError', "'" + typeName(obj) + "' object is not subscriptable");
    }

    setItem(obj, idx, v) {
      if (Array.isArray(obj)) { if (idx && idx.slice === true) { throw this.err('TypeError', 'slice assignment is not supported on this page'); } obj[this.index(obj, idx, 'list assignment')] = v; return; }
      if (obj instanceof PyDict) { obj.set(idx, v); return; }
      throw this.err('TypeError', "'" + typeName(obj) + "' object does not support item assignment");
    }

    // ----- expressions -----
    *eval(e, scope) {
      switch (e.k) {
        case 'Const': return e.v;
        case 'Str': return e.v;
        case 'Name': return this.lookup(e.id, scope);
        case 'Concat': { let s = ''; for (const p of e.parts) s += yield* this.eval(p, scope); return s; }
        case 'FStr': {
          let s = '';
          for (const p of e.parts) {
            if (p.k === 'Str') { s += p.v; continue; }
            let v = yield* this.eval(p.e, scope);
            if (p.conv === 'r') v = repr(v); else if (p.conv === 's') v = str(v);
            s += formatValue(v, p.spec);
          }
          return s;
        }
        case 'List': { const out = []; for (const x of e.items) out.push(yield* this.eval(x, scope)); return out; }
        case 'Tuple': { const out = []; for (const x of e.items) out.push(yield* this.eval(x, scope)); return new Tuple(out); }
        case 'Dict': { const d = new PyDict(); for (let i = 0; i < e.keys.length; i++) { const k = yield* this.eval(e.keys[i], scope); d.set(k, yield* this.eval(e.vals[i], scope)); } return d; }
        case 'Bin': { const a = yield* this.eval(e.a, scope); const b = yield* this.eval(e.b, scope); return binop(e.op, a, b); }
        case 'Unary': {
          const v = yield* this.eval(e.v, scope);
          if (!isNum(v)) throw this.err('TypeError', "bad operand type for unary " + e.op + ": '" + typeName(v) + "'");
          if (e.op === '+') return v === true ? 1 : v === false ? 0 : v;
          return v instanceof PyFloat ? F(-v.v) : -num(v);
        }
        case 'Not': return !truthy(yield* this.eval(e.v, scope));
        case 'Bool': {
          const a = yield* this.eval(e.a, scope);
          if (e.op === 'and') return truthy(a) ? yield* this.eval(e.b, scope) : a;
          return truthy(a) ? a : yield* this.eval(e.b, scope);
        }
        case 'IfExp': return truthy(yield* this.eval(e.test, scope)) ? yield* this.eval(e.body, scope) : yield* this.eval(e.orelse, scope);
        case 'Compare': {
          let a = yield* this.eval(e.first, scope);
          for (let i = 0; i < e.ops.length; i++) {
            const b = yield* this.eval(e.rest[i], scope);
            let ok;
            switch (e.ops[i]) {
              case '==': ok = eq(a, b); break;
              case '!=': ok = !eq(a, b); break;
              case '<': ok = cmp(a, b, '<') < 0; break;
              case '>': ok = cmp(a, b, '>') > 0; break;
              case '<=': ok = cmp(a, b, '<=') <= 0; break;
              case '>=': ok = cmp(a, b, '>=') >= 0; break;
              case 'in': ok = contains(b, a); break;
              case 'not in': ok = !contains(b, a); break;
              case 'is': ok = a === b || (a === null && b === null); break;
              case 'is not': ok = !(a === b || (a === null && b === null)); break;
            }
            if (!ok) return false;
            a = b;
          }
          return true;
        }
        case 'Subscript': {
          const obj = yield* this.eval(e.v, scope);
          let idx;
          if (e.idx.k === 'Slice') idx = { slice: true, lo: e.idx.lo ? yield* this.eval(e.idx.lo, scope) : null, hi: e.idx.hi ? yield* this.eval(e.idx.hi, scope) : null, st: e.idx.st ? yield* this.eval(e.idx.st, scope) : null };
          else idx = yield* this.eval(e.idx, scope);
          return this.getItem(obj, idx);
        }
        case 'Attr': return this.getAttr(yield* this.eval(e.v, scope), e.name);
        case 'Call': {
          const fn = yield* this.eval(e.fn, scope);
          const args = [];
          for (const a of e.args) args.push(yield* this.eval(a, scope));
          const kw = {};
          for (const k of e.kwargs) kw[k.name] = yield* this.eval(k.value, scope);
          return yield* this.call(fn, args, kw);
        }
        case 'Lambda': {
          const defs = [];
          for (const p of e.params) defs.push({ name: p.name, def: p.def ? yield* this.eval(p.def, scope) : undefined, hasDef: !!p.def });
          const fn = new PyFunc('<lambda>', defs, [{ k: 'Return', value: e.body, line: e.line }], scope, e.line, true); fn.file = this.filename; fn.src = this.src;
          return fn;
        }
        case 'Comp': {
          const inner = { vars: new Map(), globalNames: new Set(), fn: { locals: new Set(), closure: scope }, comp: true };
          const self = this;
          const out = e.kind === 'Dict' ? new PyDict() : [];
          function* loop(i) {
            if (i === e.gens.length) {
              if (e.kind === 'Dict') out.set(yield* self.eval(e.elt, inner), yield* self.eval(e.val, inner));
              else out.push(yield* self.eval(e.elt, inner));
              return;
            }
            const g = e.gens[i];
            const items = self.iterate(yield* self.eval(g.iter, i === 0 ? scope : inner));
            for (const it of items) {
              yield* self.assign(g.target, it, inner);
              let ok = true;
              for (const c of g.ifs) if (!truthy(yield* self.eval(c, inner))) { ok = false; break; }
              if (ok) yield* loop(i + 1);
            }
          }
          yield* loop(0);
          return e.kind === 'Gen' ? new PyIter(out, 'generator') : out;
        }
        case 'Slice': throw this.err('SyntaxError', 'invalid syntax');
      }
      throw this.err('SyntaxError', 'unsupported expression');
    }

    getAttr(obj, name) {
      if (obj instanceof PyModule) {
        if (name in obj.attrs) return obj.attrs[name];
        throw this.err('AttributeError', "module '" + obj.name + "' has no attribute '" + name + "'");
      }
      const table = typeof obj === 'string' ? STR_METHODS : Array.isArray(obj) ? LIST_METHODS : obj instanceof PyDict ? DICT_METHODS : obj instanceof PyFile ? FILE_METHODS : null;
      if (obj instanceof PyIter && obj.fieldnames && name === 'fieldnames') return obj.fieldnames.slice();
      if (obj instanceof PyFloat && name === 'is_integer') return new Bound(obj, name, () => Number.isInteger(obj.v));
      if (table && hasOwn(table, name)) {
        const m = table[name];
        return new Bound(obj, name, m.fn || m, !!m.gen);
      }
      throw this.err('AttributeError', "'" + typeName(obj) + "' object has no attribute '" + name + "'");
    }

    *call(fn, args, kw) {
      if (fn instanceof Builtin || fn instanceof Bound) {
        const self = fn instanceof Bound ? fn.self : undefined;
        if (fn.gen) return yield* fn.fn.call(this, args, kw, self);
        return fn.fn.call(this, args, kw, self);
      }
      if (fn instanceof PyType) return yield* fn.call.call(this, args, kw);
      if (fn instanceof PyFunc) {
        const scope = { vars: new Map(), globalNames: new Set(), fn };
        const ps = fn.params;
        if (args.length > ps.length) {
          const req = ps.filter((p) => !p.hasDef).length;
          const takes = req === ps.length ? ps.length + ' positional argument' + (ps.length === 1 ? '' : 's') : 'from ' + req + ' to ' + ps.length + ' positional arguments';
          throw this.err('TypeError', fn.name + '() takes ' + takes + ' but ' + args.length + (args.length === 1 ? ' was' : ' were') + ' given');
        }
        ps.forEach((p, i) => { if (i < args.length) scope.vars.set(p.name, args[i]); });
        for (const k in kw) {
          if (!ps.some((p) => p.name === k)) throw this.err('TypeError', fn.name + "() got an unexpected keyword argument '" + k + "'");
          if (scope.vars.has(k)) throw this.err('TypeError', fn.name + "() got multiple values for argument '" + k + "'");
          scope.vars.set(k, kw[k]);
        }
        const missing = ps.filter((p) => !scope.vars.has(p.name) && !p.hasDef).map((p) => "'" + p.name + "'");
        if (missing.length) {
          const list = missing.length === 1 ? missing[0] : missing.slice(0, -1).join(', ') + ' and ' + missing[missing.length - 1];
          throw this.err('TypeError', fn.name + '() missing ' + missing.length + ' required positional argument' + (missing.length === 1 ? '' : 's') + ': ' + list);
        }
        ps.forEach((p) => { if (!scope.vars.has(p.name)) scope.vars.set(p.name, p.def); });
        if (this.stack.length > 990) throw this.err('RecursionError', 'maximum recursion depth exceeded');
        this.stack.push({ name: fn.name, line: fn.line, file: fn.file, src: fn.src });
        try {
          const r = yield* this.execBlock(fn.body, scope);
          return r && r.sig === 'return' ? r.value : null;
        } finally { this.stack.pop(); }
      }
      throw this.err('TypeError', "'" + typeName(fn) + "' object is not callable");
    }

    // ----- matplotlib stand-in -----
    fig() { if (!this.figure) this.figure = { series: [], title: '', xlabel: '', ylabel: '', ylim: null, xticks: null }; return this.figure; }
    showFigure() { const f = this.figure; this.figure = null; if (f && f.series.length && this.opts.figure) this.opts.figure(f); }
  }

  function excMatches(actual, wanted) {
    if (actual === wanted || wanted === 'Exception' || wanted === 'BaseException') return true;
    const parents = { ZeroDivisionError: 'ArithmeticError', KeyError: 'LookupError', IndexError: 'LookupError', FileNotFoundError: 'OSError', ModuleNotFoundError: 'ImportError', UnboundLocalError: 'NameError', RecursionError: 'RuntimeError' };
    return parents[actual] === wanted;
  }

  function suggest(name, cands) {
    // CPython 3.12+ style "Did you mean" for close names
    const dist = (a, b) => {
      const m = a.length, n = b.length; const d = [];
      for (let i = 0; i <= m; i++) { d[i] = [i * 2]; }
      for (let j = 0; j <= n; j++) d[0][j] = j * 2;
      for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
        const c = a[i - 1] === b[j - 1] ? 0 : (a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 1 : 2);
        d[i][j] = Math.min(d[i - 1][j] + 2, d[i][j - 1] + 2, d[i - 1][j - 1] + c);
      }
      return d[m][n];
    };
    let best = null, bestD = Infinity;
    for (const c of cands) {
      if (c === name || c.startsWith('__')) continue;
      const max = Math.floor((name.length + c.length + 3) * 2 / 6);
      const d = dist(name, c);
      if (d <= max && d < bestD) { best = c; bestD = d; }
    }
    return best;
  }

  // ---------- builtins ----------
  function argc(name, args, min, max) {
    if (args.length < min) throw new PyError('TypeError', name + '() takes ' + (min === max ? 'exactly ' + min : 'at least ' + min) + ' argument' + (min === 1 ? '' : 's') + ' (' + args.length + ' given)');
    if (args.length > max) throw new PyError('TypeError', name + '() takes ' + (min === max ? 'exactly ' : 'at most ') + max + ' argument' + (max === 1 ? '' : 's') + ' (' + args.length + ' given)');
  }

  function toInt(v, base) {
    if (typeof v === 'string') {
      const s = v.trim().replace(/_/g, '');
      const b = base === undefined ? 10 : num(base);
      const ok = b === 10 ? /^[+-]?\d+$/.test(s) : b === 2 ? /^[+-]?(0b)?[01]+$/i.test(s) : b === 16 ? /^[+-]?(0x)?[0-9a-f]+$/i.test(s) : b === 8 ? /^[+-]?(0o)?[0-7]+$/i.test(s) : false;
      if (!ok || /__/.test(v.trim()) || /^_|_$/.test(v.trim())) throw new PyError('ValueError', 'invalid literal for int() with base ' + b + ': ' + repr(v));
      return parseInt(s.replace(/^([+-]?)0[box]/i, '$1'), b);
    }
    if (base !== undefined) throw new PyError('TypeError', "int() can't convert non-string with explicit base");
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'number') return v;
    if (v instanceof PyFloat) { if (!Number.isFinite(v.v)) throw new PyError(Number.isNaN(v.v) ? 'ValueError' : 'OverflowError', Number.isNaN(v.v) ? 'cannot convert float NaN to integer' : 'cannot convert float infinity to integer'); return Math.trunc(v.v); }
    throw new PyError('TypeError', "int() argument must be a string, a bytes-like object or a real number, not '" + typeName(v) + "'");
  }
  function toFloat(v) {
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase().replace(/(\d)_(?=\d)/g, '$1');
      if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/.test(s)) return F(parseFloat(s));
      if (/^[+-]?(inf|infinity)$/.test(s)) return F(s[0] === '-' ? -Infinity : Infinity);
      if (/^[+-]?nan$/.test(s)) return F(NaN);
      throw new PyError('ValueError', 'could not convert string to float: ' + repr(v));
    }
    if (isNum(v)) return F(num(v));
    throw new PyError('TypeError', "float() argument must be a string or a real number, not '" + typeName(v) + "'");
  }

  function pyRound(x, nd) {
    if (nd === undefined || nd === null) {
      if (isInt(x)) return num(x);
      const v = num(x); const f = Math.floor(v); const diff = v - f;
      if (!Number.isFinite(v)) throw new PyError(Number.isNaN(v) ? 'ValueError' : 'OverflowError', Number.isNaN(v) ? 'cannot convert float NaN to integer' : 'cannot convert float infinity to integer');
      if (diff > 0.5) return f + 1; if (diff < 0.5) return f; return f % 2 === 0 ? f : f + 1;
    }
    const n = num(nd);
    if (isInt(x)) { if (n >= 0) return num(x); const p = Math.pow(10, -n); return pyRound(F(num(x) / p)) * p; }
    const v = num(x);
    if (n > 20 || !Number.isFinite(v)) return F(v);
    if (n < 0) { const p = Math.pow(10, -n); return F(pyRound(F(v / p)) * p); }
    // the exact decimal value decides, like CPython's correctly rounded round()
    return F(parseFloat(toFixedPy(v, n)));
  }

  function* keyed(self, items, key) {
    if (!key || key === null) return items.map((x) => [x, x]);
    const out = [];
    for (const x of items) out.push([yield* self.call(key, [x], {}), x]);
    return out;
  }

  const B = (name, fn, gen) => new Builtin(name, fn, gen);
  const BUILTINS = {
    print: B('print', function* (args, kw) {
      const sep = kw.sep === undefined || kw.sep === null ? ' ' : kw.sep;
      const end = kw.end === undefined || kw.end === null ? '\n' : kw.end;
      this.out(args.map((a) => str(a)).join(sep) + end, 'out');
    }, true),
    input: B('input', function* (args) {
      const prompt = args.length ? str(args[0]) : '';
      if (prompt) this.out(prompt, 'out');
      const v = yield { input: prompt };
      this.out(v + '\n', 'in');
      return v;
    }, true),
    len: B('len', function (args) {
      argc('len', args, 1, 1);
      const v = args[0];
      if (typeof v === 'string') return [...v].length;
      if (Array.isArray(v)) return v.length;
      if (v instanceof Tuple) return v.items.length;
      if (v instanceof PyDict) return v.size;
      if (v instanceof DictView) return v.dict.size;
      if (v instanceof PyRange) return rangeLen(v);
      throw new PyError('TypeError', "object of type '" + typeName(v) + "' has no len()");
    }),
    range: B('range', function (args) {
      argc('range', args, 1, 3);
      args.forEach((a) => { if (!isInt(a)) throw new PyError('TypeError', "'" + typeName(a) + "' object cannot be interpreted as an integer"); });
      const a = args.map(num);
      if (a.length === 1) return new PyRange(0, a[0], 1);
      if (a[2] === 0) throw new PyError('ValueError', 'range() arg 3 must not be zero');
      return new PyRange(a[0], a[1], a.length === 3 ? a[2] : 1);
    }),
    abs: B('abs', (args) => { argc('abs', args, 1, 1); const v = args[0]; if (!isNum(v)) throw new PyError('TypeError', "bad operand type for abs(): '" + typeName(v) + "'"); return v instanceof PyFloat ? F(Math.abs(v.v)) : Math.abs(num(v)); }),
    round: B('round', (args, kw) => { const nd = args.length > 1 ? args[1] : kw.ndigits; if (!isNum(args[0])) throw new PyError('TypeError', "type " + typeName(args[0]) + " doesn't define __round__ method"); return pyRound(args[0], nd === null ? undefined : nd); }),
    sum: B('sum', function (args) {
      argc('sum', args, 1, 2);
      let total = args.length > 1 ? args[1] : 0;
      // Like CPython 3.12+, floats are added with Neumaier compensated summation.
      let f = null, c = 0;
      for (const x of this.iterate(args[0])) {
        if (f === null && x instanceof PyFloat && isNum(total)) { f = num(total); c = 0; }
        if (f !== null && isNum(x)) {
          const v = num(x), t = f + v;
          if (Math.abs(f) >= Math.abs(v)) c += (f - t) + v; else c += (v - t) + f;
          f = t;
        } else {
          if (f !== null) { total = F(f + c); f = null; }
          total = binop('+', total, x);
        }
      }
      if (f !== null) total = F(c && Number.isFinite(c) ? f + c : f);
      return total;
    }),
    max: B('max', function* (args, kw) { return yield* minmax.call(this, 'max', args, kw); }, true),
    min: B('min', function* (args, kw) { return yield* minmax.call(this, 'min', args, kw); }, true),
    sorted: B('sorted', function* (args, kw) {
      argc('sorted', args, 1, 1);
      const pairs = yield* keyed(this, this.iterate(args[0]), kw.key);
      pairs.sort((a, b) => cmp(a[0], b[0], '<'));
      const out = pairs.map((p) => p[1]);
      if (kw.reverse && truthy(kw.reverse)) { pairs.sort((a, b) => cmp(b[0], a[0], '<')); return pairs.map((p) => p[1]); }
      return out;
    }, true),
    reversed: B('reversed', function (args) { argc('reversed', args, 1, 1); return new PyIter(this.iterate(args[0]).reverse(), 'list_reverseiterator'); }),
    enumerate: B('enumerate', function (args, kw) { const start = args.length > 1 ? num(args[1]) : kw.start !== undefined ? num(kw.start) : 0; return new PyIter(this.iterate(args[0]).map((x, i) => new Tuple([i + start, x])), 'enumerate'); }),
    zip: B('zip', function (args) { const lists = args.map((a) => this.iterate(a)); const n = lists.length ? Math.min(...lists.map((l) => l.length)) : 0; const out = []; for (let i = 0; i < n; i++) out.push(new Tuple(lists.map((l) => l[i]))); return new PyIter(out, 'zip'); }),
    any: B('any', function (args) { return this.iterate(args[0]).some(truthy); }),
    all: B('all', function (args) { return this.iterate(args[0]).every(truthy); }),
    chr: B('chr', (args) => String.fromCodePoint(num(args[0]))),
    ord: B('ord', (args) => { if (typeof args[0] !== 'string' || [...args[0]].length !== 1) throw new PyError('TypeError', 'ord() expected a character, but string of length ' + (typeof args[0] === 'string' ? [...args[0]].length : 0) + ' found'); return args[0].codePointAt(0); }),
    next: B('next', function (args) {
      const it = args[0];
      if (it instanceof PyIter) { if (it.i < it.items.length) return it.items[it.i++]; }
      else if (it instanceof PyFile) { if (it.i < it.lines.length) return it.lines[it.i++]; }
      else throw new PyError('TypeError', "'" + typeName(it) + "' object is not an iterator");
      if (args.length > 1) return args[1];
      throw new PyError('StopIteration', '');
    }),
    iter: B('iter', function (args) { return args[0] instanceof PyIter || args[0] instanceof PyFile ? args[0] : new PyIter(this.iterate(args[0]), typeName(args[0]) + '_iterator'); }),
    map: B('map', function* (args) { const out = []; for (const x of this.iterate(args[1])) out.push(yield* this.call(args[0], [x], {})); return new PyIter(out, 'map'); }, true),
    filter: B('filter', function* (args) { const out = []; for (const x of this.iterate(args[1])) if (truthy(args[0] === null ? x : yield* this.call(args[0], [x], {}))) out.push(x); return new PyIter(out, 'filter'); }, true),
    isinstance: B('isinstance', (args) => { const types = args[1] instanceof Tuple ? args[1].items : [args[1]]; const t = typeName(args[0]); return types.some((ty) => ty instanceof PyType && (ty.name === t || (ty.name === 'int' && t === 'bool'))); }),
    format: B('format', (args) => formatValue(args[0], args.length > 1 ? args[1] : '')),
    repr: B('repr', (args) => repr(args[0])),
    open: B('open', function (args, kw) {
      const name = args[0]; const mode = args.length > 1 ? args[1] : kw.mode || 'r';
      if (typeof name !== 'string') throw new PyError('TypeError', 'expected str, bytes or os.PathLike object, not ' + typeName(name));
      if (mode !== 'r' && mode !== 'rt') throw new PyError('OSError', 'this page can only read files, not write them');
      if (!Object.prototype.hasOwnProperty.call(this.files, name)) throw new PyError('FileNotFoundError', "[Errno 2] No such file or directory: " + repr(name));
      return new PyFile(name, this.files[name]);
    }),
    exit: B('exit', () => { throw new PyError('SystemExit', ''); }),
    quit: B('quit', () => { throw new PyError('SystemExit', ''); }),
    help: B('help', function () { this.out('help() is not available on this page. Try the Python docs at docs.python.org.\n', 'out'); return null; })
  };

  function* minmax(name, args, kw) {
    let items = args.length === 1 ? this.iterate(args[0]) : args;
    if (args.length === 0) throw new PyError('TypeError', name + ' expected at least 1 argument, got 0');
    if (!items.length) { if (kw.default !== undefined) return kw.default; throw new PyError('ValueError', name + '() iterable argument is empty'); }
    const pairs = yield* keyed(this, items, kw.key);
    let best = pairs[0];
    for (const p of pairs.slice(1)) { const c = cmp(p[0], best[0], name === 'max' ? '>' : '<'); if (name === 'max' ? c > 0 : c < 0) best = p; }
    return best[1];
  }

  const T = (name, fn) => new PyType(name, fn);
  BUILTINS.int = T('int', function* (args) { if (!args.length) return 0; return toInt(args[0], args[1]); });
  BUILTINS.float = T('float', function* (args) { if (!args.length) return F(0); return toFloat(args[0]); });
  BUILTINS.str = T('str', function* (args) { return args.length ? str(args[0]) : ''; });
  BUILTINS.bool = T('bool', function* (args) { return args.length ? truthy(args[0]) : false; });
  BUILTINS.list = T('list', function* (args) { return args.length ? this.iterate(args[0]) : []; });
  BUILTINS.tuple = T('tuple', function* (args) { return new Tuple(args.length ? this.iterate(args[0]) : []); });
  BUILTINS.dict = T('dict', function* (args, kw) {
    const d = new PyDict();
    if (args.length) {
      if (args[0] instanceof PyDict) args[0].entries().forEach((e) => d.set(e[0], e[1]));
      else for (const pair of this.iterate(args[0])) { const kv = this.iterate(pair); d.set(kv[0], kv[1]); }
    }
    for (const k in kw) d.set(k, kw[k]);
    return d;
  });
  BUILTINS.type = T('type', function* (args) { const n = typeName(args[0]); return BUILTINS[n] instanceof PyType ? BUILTINS[n] : new PyType(n); });
  for (const ex of ['Exception', 'ValueError', 'TypeError', 'KeyError', 'IndexError', 'NameError', 'ZeroDivisionError', 'FileNotFoundError', 'StopIteration', 'RuntimeError', 'AttributeError']) {
    BUILTINS[ex] = T(ex, function* (args) { return { excType: ex, msg: args.length ? str(args[0]) : '' }; });
  }

  // ---------- methods ----------
  const strArg = (name, v) => { if (typeof v !== 'string') throw new PyError('TypeError', name + ' arg must be None or str'); return v; };
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
  const STR_METHODS = {
    lower: (a, k, s) => s.toLowerCase(),
    upper: (a, k, s) => s.toUpperCase(),
    strip: (a, k, s) => (a.length && a[0] !== null ? s.replace(new RegExp('^[' + reEsc(strArg('strip', a[0])) + ']+|[' + reEsc(a[0]) + ']+$', 'g'), '') : s.replace(/^\s+|\s+$/g, '')),
    lstrip: (a, k, s) => (a.length && a[0] !== null ? s.replace(new RegExp('^[' + reEsc(strArg('lstrip', a[0])) + ']+'), '') : s.replace(/^\s+/, '')),
    rstrip: (a, k, s) => (a.length && a[0] !== null ? s.replace(new RegExp('[' + reEsc(strArg('rstrip', a[0])) + ']+$'), '') : s.replace(/\s+$/, '')),
    split: (a, k, s) => {
      const sep = a.length ? a[0] : k.sep !== undefined ? k.sep : null;
      const max = a.length > 1 ? num(a[1]) : k.maxsplit !== undefined ? num(k.maxsplit) : -1;
      if (sep === null) {
        const parts = s.trim().split(/\s+/).filter((x) => x !== '');
        if (max >= 0 && parts.length > max + 1) { let rest = s.trim(); const out = []; for (let i = 0; i < max; i++) { const m = rest.match(/^(\S+)\s+/); out.push(m[1]); rest = rest.slice(m[0].length); } out.push(rest); return out; }
        return parts;
      }
      if (sep === '') throw new PyError('ValueError', 'empty separator');
      const parts = s.split(sep);
      if (max >= 0 && parts.length > max + 1) return parts.slice(0, max).concat([parts.slice(max).join(sep)]);
      return parts;
    },
    join: function (a, k, s) {
      const items = this.iterate(a[0]);
      items.forEach((x, i) => { if (typeof x !== 'string') throw new PyError('TypeError', 'sequence item ' + i + ': expected str instance, ' + typeName(x) + ' found'); });
      return items.join(s);
    },
    replace: (a, k, s) => (a.length > 2 ? (() => { let out = s, n = num(a[2]), idx = 0; let res = ''; while (n-- > 0) { const j = out.indexOf(a[0], idx); if (j < 0) break; res += out.slice(idx, j) + a[1]; idx = j + a[0].length; } return res + out.slice(idx); })() : s.split(a[0]).join(a[1])),
    startswith: (a, k, s) => (a[0] instanceof Tuple ? a[0].items.some((p) => s.startsWith(p)) : s.startsWith(a[0])),
    endswith: (a, k, s) => (a[0] instanceof Tuple ? a[0].items.some((p) => s.endsWith(p)) : s.endsWith(a[0])),
    find: (a, k, s) => s.indexOf(a[0]),
    index: (a, k, s) => { const i = s.indexOf(a[0]); if (i < 0) throw new PyError('ValueError', 'substring not found'); return i; },
    count: (a, k, s) => (a[0] === '' ? s.length + 1 : s.split(a[0]).length - 1),
    isdigit: (a, k, s) => /^\d+$/.test(s),
    isnumeric: (a, k, s) => /^\d+$/.test(s),
    isalpha: (a, k, s) => /^[A-Za-zÀ-￿]+$/.test(s),
    isalnum: (a, k, s) => /^[A-Za-z0-9À-￿]+$/.test(s),
    isspace: (a, k, s) => /^\s+$/.test(s),
    isupper: (a, k, s) => /[A-Z]/.test(s) && s === s.toUpperCase(),
    islower: (a, k, s) => /[a-z]/.test(s) && s === s.toLowerCase(),
    title: (a, k, s) => s.toLowerCase().replace(/(^|[^A-Za-z])([a-z])/g, (m, p, c) => p + c.toUpperCase()),
    capitalize: (a, k, s) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s),
    zfill: (a, k, s) => { const w = num(a[0]); const sg = /^[+-]/.test(s) ? s[0] : ''; const body = s.slice(sg.length); return sg + body.padStart(w - sg.length, '0'); },
    center: (a, k, s) => { const w = num(a[0]); const f = a[1] || ' '; if (s.length >= w) return s; const pad = w - s.length; const left = Math.floor(pad / 2) + (pad % 2 && w % 2 ? 1 : 0); return f.repeat(left) + s + f.repeat(pad - left); },
    ljust: (a, k, s) => s.padEnd(num(a[0]), a[1] || ' '),
    rjust: (a, k, s) => s.padStart(num(a[0]), a[1] || ' '),
    format: function (a, k, s) {
      let auto = 0;
      return s.replace(/\{\{|\}\}|\{([^{}:!]*)(?:!([rs]))?(?::([^{}]*))?\}/g, (m, field, conv, spec) => {
        if (m === '{{') return '{'; if (m === '}}') return '}';
        let v;
        if (field === '') v = a[auto++];
        else if (/^\d+$/.test(field)) v = a[+field];
        else v = k[field];
        if (v === undefined) throw new PyError(field === '' || /^\d+$/.test(field) ? 'IndexError' : 'KeyError', field === '' || /^\d+$/.test(field) ? 'Replacement index ' + (field || auto - 1) + ' out of range for positional args tuple' : repr(field));
        if (conv === 'r') v = repr(v);
        return formatValue(v, spec || '');
      });
    }
  };
  const LIST_METHODS = {
    append: (a, k, l) => { argc('list.append', a, 1, 1); l.push(a[0]); return null; },
    extend: function (a, k, l) { l.push(...this.iterate(a[0])); return null; },
    insert: (a, k, l) => { let i = num(a[0]); if (i < 0) i = Math.max(0, l.length + i); l.splice(Math.min(i, l.length), 0, a[1]); return null; },
    pop: (a, k, l) => {
      if (!l.length) throw new PyError('IndexError', 'pop from empty list');
      if (!a.length) return l.pop();
      let i = num(a[0]); if (i < 0) i += l.length;
      if (i < 0 || i >= l.length) throw new PyError('IndexError', 'pop index out of range');
      return l.splice(i, 1)[0];
    },
    remove: (a, k, l) => { const i = l.findIndex((x) => eq(x, a[0])); if (i < 0) throw new PyError('ValueError', 'list.remove(x): x not in list'); l.splice(i, 1); return null; },
    index: (a, k, l) => { const i = l.findIndex((x) => eq(x, a[0])); if (i < 0) throw new PyError('ValueError', repr(a[0]) + ' is not in list'); return i; },
    count: (a, k, l) => l.filter((x) => eq(x, a[0])).length,
    sort: { gen: true, fn: function* (a, k, l) { const pairs = yield* keyed(this, l, k.key); pairs.sort((x, y) => (k.reverse && truthy(k.reverse) ? cmp(y[0], x[0], '<') : cmp(x[0], y[0], '<'))); pairs.forEach((p, i) => { l[i] = p[1]; }); return null; } },
    reverse: (a, k, l) => { l.reverse(); return null; },
    copy: (a, k, l) => l.slice(),
    clear: (a, k, l) => { l.length = 0; return null; }
  };
  const DICT_METHODS = {
    get: (a, k, d) => { const v = d.get(a[0]); return v === undefined ? (a.length > 1 ? a[1] : null) : v; },
    keys: (a, k, d) => new DictView('keys', d),
    values: (a, k, d) => new DictView('values', d),
    items: (a, k, d) => new DictView('items', d),
    pop: (a, k, d) => { const v = d.get(a[0]); if (v === undefined) { if (a.length > 1) return a[1]; throw new PyError('KeyError', repr(a[0])); } d.del(a[0]); return v; },
    setdefault: (a, k, d) => { if (!d.has(a[0])) d.set(a[0], a.length > 1 ? a[1] : null); return d.get(a[0]); },
    update: function (a, k, d) { if (a.length) { if (a[0] instanceof PyDict) a[0].entries().forEach((e) => d.set(e[0], e[1])); else for (const p of this.iterate(a[0])) { const kv = this.iterate(p); d.set(kv[0], kv[1]); } } for (const key in k) d.set(key, k[key]); return null; },
    copy: (a, k, d) => { const n = new PyDict(); d.entries().forEach((e) => n.set(e[0], e[1])); return n; },
    clear: (a, k, d) => { d.map.clear(); return null; }
  };
  const FILE_METHODS = {
    read: function (a, k, f) { if (f.closed) throw new PyError('ValueError', 'I/O operation on closed file.'); const s = f.lines.slice(f.i).join(''); f.i = f.lines.length; return s; },
    readline: function (a, k, f) { if (f.closed) throw new PyError('ValueError', 'I/O operation on closed file.'); return f.i < f.lines.length ? f.lines[f.i++] : ''; },
    readlines: function (a, k, f) { if (f.closed) throw new PyError('ValueError', 'I/O operation on closed file.'); const out = f.lines.slice(f.i); f.i = f.lines.length; return out; },
    close: (a, k, f) => { f.closed = true; return null; }
  };

  // ---------- modules ----------
  function csvSplit(line) {
    const out = []; let cur = '', q = false;
    line = line.replace(/\r?\n$/, '');
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"' && cur === '') q = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out;
  }
  const MODULES = {
    csv: () => new PyModule('csv', {
      reader: B('reader', function (args) { const lines = this.iterate(args[0]); return new PyIter(lines.map((l) => (l === '\n' || l === '' ? [] : csvSplit(l))), '_csv.reader'); }),
      DictReader: B('DictReader', function (args) {
        const lines = this.iterate(args[0]).filter((l) => l.trim() !== '');
        if (!lines.length) return new PyIter([], 'DictReader');
        const head = csvSplit(lines[0]);
        const rows = lines.slice(1).map((l) => { const cells = csvSplit(l); const d = new PyDict(); head.forEach((h, i) => d.set(h, i < cells.length ? cells[i] : null)); return d; });
        const it = new PyIter(rows, 'DictReader'); it.fieldnames = head; return it;
      })
    }),
    math: () => new PyModule('math', {
      pi: F(Math.PI), e: F(Math.E),
      sqrt: B('sqrt', (a) => { if (num(a[0]) < 0) throw new PyError('ValueError', 'math domain error'); return F(Math.sqrt(num(a[0]))); }),
      floor: B('floor', (a) => Math.floor(num(a[0]))),
      ceil: B('ceil', (a) => Math.ceil(num(a[0])))
    }),
    random: () => new PyModule('random', {
      randint: B('randint', (a) => num(a[0]) + Math.floor(Math.random() * (num(a[1]) - num(a[0]) + 1))),
      choice: B('choice', function (a) { const l = this.iterate(a[0]); if (!l.length) throw new PyError('IndexError', 'Cannot choose from an empty sequence'); return l[Math.floor(Math.random() * l.length)]; }),
      random: B('random', () => F(Math.random())),
      shuffle: B('shuffle', (a) => { const l = a[0]; for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return null; })
    }),
    matplotlib: () => new PyModule('matplotlib', { pyplot: MODULES['matplotlib.pyplot']() }),
    'matplotlib.pyplot': () => {
      const add = (kind) => B(kind, function (args, kw) {
        const f = this.fig();
        let x, y;
        if (args.length === 1) { y = this.iterate(args[0]); x = y.map((_, i) => i); }
        else { x = this.iterate(args[0]); y = this.iterate(args[1]); }
        if (x.length !== y.length) throw new PyError('ValueError', 'x and y must have same first dimension, but have shapes (' + x.length + ',) and (' + y.length + ',)');
        y.forEach((v) => { if (!isNum(v)) throw new PyError('TypeError', "unsupported operand type(s) for -: '" + typeName(v) + "' and 'float'"); });
        f.series.push({ kind, x, y: y.map(num), color: kw.color || null, label: kw.label || null, marker: kw.marker || null });
        return null;
      });
      const setter = (key) => B(key, function (args) { this.fig()[key] = args.length ? str(args[0]) : ''; return null; });
      return new PyModule('matplotlib.pyplot', {
        bar: add('bar'), plot: add('line'),
        title: setter('title'), xlabel: setter('xlabel'), ylabel: setter('ylabel'),
        ylim: B('ylim', function (args) { const a = args.length === 1 ? this.iterate(args[0]) : args; this.fig().ylim = [num(a[0]), num(a[1])]; return null; }),
        figure: B('figure', function () { if (this.figure) this.showFigure(); this.fig(); return null; }),
        grid: B('grid', function () { this.fig().grid = true; return null; }),
        legend: B('legend', function () { this.fig().legend = true; return null; }),
        xticks: B('xticks', function (args, kw) { if (kw.rotation !== undefined) this.fig().rotate = true; return null; }),
        tight_layout: B('tight_layout', () => null),
        show: B('show', function () { this.showFigure(); return null; })
      });
    }
  };

  // ---------- SVG chart for the matplotlib stand-in ----------
  function niceTicks(lo, hi, count) {
    const span = hi - lo || 1;
    const raw = span / count; const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) || 10 * mag;
    const out = []; for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v / step) * step);
    return { ticks: out, step };
  }
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function chartSVG(f) {
    const W = 640, H = 380, L = 64, R = 16, T = f.title ? 40 : 18, Bm = f.xlabel ? 64 : 44;
    const pw = W - L - R, ph = H - T - Bm;
    const ys = f.series.flatMap((s) => s.y);
    const hasBar = f.series.some((s) => s.kind === 'bar');
    let lo = Math.min(...ys), hi = Math.max(...ys);
    if (hasBar) { lo = Math.min(0, lo); hi = Math.max(0, hi); const m = (hi - lo) * 0.05; hi += m; if (lo < 0) lo -= m; }
    else { const m = (hi - lo || 1) * 0.05; lo -= m; hi += m; }
    if (f.ylim) [lo, hi] = f.ylim;
    const { ticks, step } = niceTicks(lo, hi, 6);
    const dec = (String(+step.toFixed(6)).split('.')[1] || '').length;
    const Y = (v) => T + ph - ((v - lo) / (hi - lo)) * ph;
    const categorical = f.series.some((s) => s.x.some((x) => typeof x === 'string'));
    const xs = categorical ? [...new Set(f.series.flatMap((s) => s.x.map(str)))] : null;
    let X, band = 0, xlo = 0, xhi = 1;
    if (categorical || hasBar) {
      const cats = xs || [...new Set(f.series.flatMap((s) => s.x.map(num)))].sort((a, b) => a - b);
      band = pw / cats.length;
      X = (x) => L + band * (cats.findIndex((c) => (xs ? c === str(x) : c === num(x)))) + band / 2;
      f._cats = cats;
    } else {
      const all = f.series.flatMap((s) => s.x.map(num)); xlo = Math.min(...all); xhi = Math.max(...all);
      const m = (xhi - xlo || 1) * 0.04; xlo -= m; xhi += m;
      X = (x) => L + ((num(x) - xlo) / (xhi - xlo)) * pw;
    }
    const COLORS = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'];
    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(f.title || 'Chart') + '" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif" font-size="13">';
    svg += '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#ffffff"/>';
    for (const t of ticks) { if (t < lo - 1e-9 || t > hi + 1e-9) continue; svg += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(t).toFixed(1) + '" y2="' + Y(t).toFixed(1) + '" stroke="' + (f.grid ? '#dddddd' : 'none') + '"/><line x1="' + (L - 5) + '" x2="' + L + '" y1="' + Y(t).toFixed(1) + '" y2="' + Y(t).toFixed(1) + '" stroke="#222"/><text x="' + (L - 8) + '" y="' + (Y(t) + 4).toFixed(1) + '" text-anchor="end" fill="#222">' + t.toFixed(dec) + '</text>'; }
    // x ticks
    if (f._cats) {
      const every = Math.ceil(f._cats.length / 12);
      f._cats.forEach((c, i) => { if (i % every) return; const x = L + band * i + band / 2; svg += '<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + (T + ph) + '" y2="' + (T + ph + 5) + '" stroke="#222"/><text x="' + x.toFixed(1) + '" y="' + (T + ph + 20) + '" text-anchor="middle" fill="#222">' + esc(typeof c === 'number' ? c : c) + '</text>'; });
    } else {
      const xt = niceTicks(xlo, xhi, 8);
      for (const t of xt.ticks) { const x = X(t); if (x < L - 1 || x > W - R + 1) continue; svg += '<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + (T + ph) + '" y2="' + (T + ph + 5) + '" stroke="#222"/><text x="' + x.toFixed(1) + '" y="' + (T + ph + 20) + '" text-anchor="middle" fill="#222">' + (Number.isInteger(t) ? t : t.toFixed(1)) + '</text>'; }
    }
    f.series.forEach((s, si) => {
      const col = s.color && /^[#a-z0-9]+$/i.test(s.color) ? s.color : COLORS[si % COLORS.length];
      if (s.kind === 'bar') {
        const bw = band * 0.8;
        s.x.forEach((x, i) => { const y0 = Y(Math.max(lo, 0)), y1 = Y(s.y[i]); svg += '<rect x="' + (X(x) - bw / 2).toFixed(1) + '" y="' + Math.min(y0, y1).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.abs(y0 - y1).toFixed(1) + '" fill="' + col + '"><title>' + esc(str(x)) + ': ' + s.y[i] + '</title></rect>'; });
      } else {
        const pts = s.x.map((x, i) => X(x).toFixed(1) + ',' + Y(s.y[i]).toFixed(1)).join(' ');
        svg += '<polyline points="' + pts + '" fill="none" stroke="' + col + '" stroke-width="2"/>';
        if (s.marker) s.x.forEach((x, i) => { svg += '<circle cx="' + X(x).toFixed(1) + '" cy="' + Y(s.y[i]).toFixed(1) + '" r="3" fill="' + col + '"><title>' + esc(str(x)) + ': ' + s.y[i] + '</title></circle>'; });
      }
    });
    svg += '<rect x="' + L + '" y="' + T + '" width="' + pw + '" height="' + ph + '" fill="none" stroke="#222"/>';
    if (f.title) svg += '<text x="' + (L + pw / 2) + '" y="24" text-anchor="middle" font-size="15" fill="#222">' + esc(f.title) + '</text>';
    if (f.xlabel) svg += '<text x="' + (L + pw / 2) + '" y="' + (H - 14) + '" text-anchor="middle" fill="#222">' + esc(f.xlabel) + '</text>';
    if (f.ylabel) svg += '<text transform="translate(16 ' + (T + ph / 2) + ') rotate(-90)" text-anchor="middle" fill="#222">' + esc(f.ylabel) + '</text>';
    if (f.legend) { let ly = T + 16; f.series.forEach((s, si) => { if (!s.label) return; const col = s.color || COLORS[si % COLORS.length]; svg += '<rect x="' + (L + 12) + '" y="' + (ly - 10) + '" width="14" height="10" fill="' + col + '"/><text x="' + (L + 32) + '" y="' + ly + '" fill="#222">' + esc(s.label) + '</text>'; ly += 18; }); }
    return svg + '</svg>';
  }

  root.MiniPy = { Interp, chartSVG, parse, formatValue, str, repr };
})(typeof window !== 'undefined' ? window : globalThis);
