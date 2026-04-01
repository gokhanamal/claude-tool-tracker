// Detail panel: syntax highlighting, open/close, keyboard nav

function syntaxHighlight(json) {
  var str = JSON.stringify(json, null, 2);
  if (!str) return document.createDocumentFragment();
  var frag = document.createDocumentFragment();
  var re = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g;
  var last = 0, match;
  while ((match = re.exec(str)) !== null) {
    if (match.index > last) frag.appendChild(document.createTextNode(str.slice(last, match.index)));
    var cls = 'json-number';
    if (/^"/.test(match[0])) { cls = /:$/.test(match[0]) ? 'json-key' : 'json-string'; }
    else if (/true|false/.test(match[0])) { cls = 'json-bool'; }
    else if (/null/.test(match[0])) { cls = 'json-null'; }
    var span = document.createElement('span');
    span.className = cls;
    span.textContent = match[0];
    frag.appendChild(span);
    last = re.lastIndex;
  }
  if (last < str.length) frag.appendChild(document.createTextNode(str.slice(last)));
  return frag;
}

function makeJsonBlock(data, maxHeight) {
  var pre = document.createElement('div');
  pre.className = 'detail-json';
  if (maxHeight) pre.style.maxHeight = maxHeight + 'px';
  pre.appendChild(syntaxHighlight(data));
  return pre;
}

function openDetail(index) {
  detailIndex = index;
  var d = filteredData[index];
  if (!d) return;
  var body = document.getElementById('detail-body');
  body.textContent = '';
  document.getElementById('detail-title').textContent = d.tool_name + ' \u2014 ' + d.event;

  // Meta
  var sec = document.createElement('div'); sec.className = 'detail-section';
  var t = document.createElement('div'); t.className = 'detail-section-title'; t.textContent = 'Metadata'; sec.appendChild(t);
  var grid = document.createElement('div'); grid.className = 'detail-meta-grid';
  [{label:'Timestamp',value:new Date(d.timestamp).toLocaleString()},{label:'Event',value:d.event},{label:'Tool',value:d.tool_name},{label:'Session',value:d.session_id||'\u2014'}].forEach(function(m){
    var item = document.createElement('div'); item.className = 'detail-meta-item';
    var lbl = document.createElement('div'); lbl.className = 'dm-label'; lbl.textContent = m.label; item.appendChild(lbl);
    var val = document.createElement('div'); val.className = 'dm-value'; val.textContent = m.value; item.appendChild(val);
    grid.appendChild(item);
  });
  sec.appendChild(grid); body.appendChild(sec);

  // Tool Input
  if (d.tool_input && Object.keys(d.tool_input).length > 0) {
    var isec = document.createElement('div'); isec.className = 'detail-section';
    var it = document.createElement('div'); it.className = 'detail-section-title'; it.textContent = 'Tool Input'; isec.appendChild(it);
    Object.keys(d.tool_input).forEach(function(key) {
      var wrap = document.createElement('div'); wrap.style.marginBottom = '10px';
      var lab = document.createElement('div'); lab.style.cssText = 'font-size:11px;color:var(--accent);margin-bottom:4px;font-weight:600;'; lab.textContent = key; wrap.appendChild(lab);
      var v = d.tool_input[key];
      if (typeof v === 'string' && v.length > 120) {
        var p = document.createElement('div'); p.className = 'detail-json'; p.style.maxHeight = '300px'; p.textContent = v; wrap.appendChild(p);
      } else if (typeof v === 'object' && v !== null) {
        wrap.appendChild(makeJsonBlock(v, 300));
      } else {
        var s = document.createElement('div'); s.style.cssText = 'font-size:13px;padding:6px 0;'; s.textContent = String(v); wrap.appendChild(s);
      }
      isec.appendChild(wrap);
    });
    body.appendChild(isec);
  }

  // Tool Response
  if (d.tool_response && Object.keys(d.tool_response).length > 0) {
    var rsec = document.createElement('div'); rsec.className = 'detail-section';
    var rt = document.createElement('div'); rt.className = 'detail-section-title'; rt.textContent = 'Tool Response'; rsec.appendChild(rt);
    rsec.appendChild(makeJsonBlock(d.tool_response, 400));
    body.appendChild(rsec);
  }

  document.getElementById('detail-prev').disabled = index <= 0;
  document.getElementById('detail-next').disabled = index >= filteredData.length - 1;
  document.getElementById('detail-overlay').classList.add('open');
  document.getElementById('detail-panel').classList.add('open');
}

function closeDetail() {
  document.getElementById('detail-overlay').classList.remove('open');
  document.getElementById('detail-panel').classList.remove('open');
  detailIndex = -1;
}

document.getElementById('detail-overlay').addEventListener('click', closeDetail);
document.getElementById('detail-close').addEventListener('click', closeDetail);
document.getElementById('detail-prev').addEventListener('click', function() { if (detailIndex > 0) openDetail(detailIndex - 1); });
document.getElementById('detail-next').addEventListener('click', function() { if (detailIndex < filteredData.length - 1) openDetail(detailIndex + 1); });
document.addEventListener('keydown', function(e) {
  if (detailIndex < 0) return;
  if (e.key === 'Escape') closeDetail();
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); if (detailIndex > 0) openDetail(detailIndex - 1); }
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); if (detailIndex < filteredData.length - 1) openDetail(detailIndex + 1); }
});
