// Colours Python in <pre><code class="py"> blocks. It builds spans with
// textContent, so the code on the page is never parsed as HTML.
(function () {
  var KW = /^(False|None|True|and|as|break|continue|def|elif|else|for|from|global|if|import|in|is|not|or|return|while|with|lambda|pass)$/;
  var FN = /^(print|input|int|map|range|len|set|list|sorted|sum|min|max|abs|divmod|tuple|float|open|deque|enumerate|zip)$/;
  var TOKEN = /(#[^\n]*)|([fF]?"""[\s\S]*?"""|[fF]?"(?:\\.|[^"\\\n])*"|[fF]?'(?:\\.|[^'\\\n])*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)/g;

  function paint(code) {
    var text = code.textContent;
    var out = document.createDocumentFragment();
    var last = 0;
    var m;
    function span(cls, s) {
      var el = document.createElement('span');
      el.className = cls;
      el.textContent = s;
      out.appendChild(el);
    }
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(text)) !== null) {
      if (m.index > last) out.appendChild(document.createTextNode(text.slice(last, m.index)));
      if (m[1]) span('tok-com', m[1]);
      else if (m[2]) span('tok-str', m[2]);
      else if (m[3]) span('tok-num', m[3]);
      else if (KW.test(m[4])) span('tok-kw', m[4]);
      else if (FN.test(m[4])) span('tok-fn', m[4]);
      else out.appendChild(document.createTextNode(m[4]));
      last = TOKEN.lastIndex;
    }
    if (last < text.length) out.appendChild(document.createTextNode(text.slice(last)));
    code.textContent = '';
    code.appendChild(out);
  }

  document.querySelectorAll('pre code.py').forEach(paint);
  window.paintPython = paint;
})();
