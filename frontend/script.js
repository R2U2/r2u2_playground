//script.js
var curr_step = -1; // Tracks line of CSV Trace
var globalSpecMap = new Map();
var globalSpecMapReverse = new Map();
var globalContractMap = new Map();
var globalVerdicts = [];
var globalContracts = [];
var globalTimestamps = [];
var globalAdditionalGraphsDisplayed = [];
var currVerdicts = new Map();
var maxIndex = 0;
var globalTree = [];

class TreeNode {
  constructor(data) {
    this.data = data;
    this.children = [];
  }

  addChild(node) {
    this.children.push(node);
  }
}

class Tree {
  constructor(data) {
    this.root = new TreeNode(data);
  }

  traverse(callback) {
    function walk(node) {
      callback(node);
      node.children.forEach(walk);
    }
    walk(this.root);
  }

  getTree(){
    var nodes= [];
    this.traverse(node => nodes.push(node));
    //Consolidate indentical nodes
    for(var i = 1; i < nodes.length; i++){ // Don't need to check root node
      for(var j = i; j < nodes.length; j++){
        if(i != j && nodes[i].data.instr_num == nodes[j].data.instr_num){
            nodes[i].data.parents = nodes[i].data.parents.concat(nodes[j].data.parents);
            nodes.splice(j, 1); // Delete node
            j--;
        }
      }
    }
    return nodes;
  }
}

function prune_nodes(nodes){
  if (!document.getElementById('CSEEnabled').checked){
    return nodes;
  }
  var copy = structuredClone(nodes);
  //Consolidate indentical nodes
  for(var i = 0; i < copy.length; i++){
    for(var j = 0; j < copy.length; j++){
      if(i != j && copy[i].data.instr_num == copy[j].data.instr_num){
          copy[i].data.parents = copy[i].data.parents.concat(copy[j].data.parents);
          copy.splice(j, 1); // Delete node
          j--;
      }
    }
  }
  return copy;
}

var editor = CodeMirror.fromTextArea(document.getElementById('c2po'), {
  lineNumbers: true,
  gutter: true,
  theme: 'dracula',
});

var editor2 = CodeMirror.fromTextArea(document.getElementById('assembly'), {
  lineNumbers: true,
  gutter: true,
  theme: 'dracula',
  readOnly: true,
});

var editor3 = CodeMirror.fromTextArea(document.getElementById('trace'), {
  lineNumbers: true,
  gutter: true,
  theme: 'dracula',
});

var editor4 = CodeMirror.fromTextArea(document.getElementById('output'), {
  lineNumbers: true,
  gutter: true,
  theme: 'dracula',
  readOnly: true
});

var editor5 = CodeMirror.fromTextArea(document.getElementById('memory'), {
  lineNumbers: true,
  gutter: true,
  theme: 'dracula',
  readOnly: true
});

editor.on("change", function() {
  if (curr_step != -1) {
    reset();
    editor2.setValue("");
    editor2.refresh();
  }
});

editor3.on("change", function() {
  if (curr_step != -1) {
    reset();
  }
});

var tabs_upper_left = document.getElementById('upper left editor').querySelectorAll('.tab');

for (var i = 0; i < tabs_upper_left.length; i++) {
  var self = tabs_upper_left[i];
  self.addEventListener('click', function() {
    var data = this.getAttribute('data-tab');
    document.getElementById('upper left editor').querySelectorAll('.tab-pane.active')[0].classList.remove('active');
    document.getElementById('upper left editor').querySelectorAll('.tab-pane[data-pane="'+data+'"]')[0].classList.add('active');
    document.getElementById('upper left editor').querySelectorAll('.tab.active')[0].classList.remove('active');
    this.classList.add('active');
    if (data == 1){ // Assembly Tab is active
      editor2.refresh();
    }
  });
}

var tabs_bottom = document.getElementById('bottom editor').querySelectorAll('.tab');

for (var i = 0; i < tabs_bottom.length; i++) {
  var self = tabs_bottom[i];
  self.addEventListener('click', function() {
    var data = this.getAttribute('data-tab');
    document.getElementById('bottom editor').querySelectorAll('.tab-pane.active')[0].classList.remove('active');
    document.getElementById('bottom editor').querySelectorAll('.tab-pane[data-pane="'+data+'"]')[0].classList.add('active');
    document.getElementById('bottom editor').querySelectorAll('.tab.active')[0].classList.remove('active');
    this.classList.add('active');
    if (data == 7){ // Memory Usage Tab is active
      editor5.refresh();
    }
  });
}

function remove_ansi_codes(text){
  text = text.replaceAll("\u001b[95m", "");
  text = text.replaceAll("\u001b[94m", "");
  text = text.replaceAll("\u001b[96m", "");
  text = text.replaceAll("\u001b[92m", "");
  text = text.replaceAll("\u001b[93m", "");
  text = text.replaceAll("\u001b[91m", "");
  text = text.replaceAll("\u001b[0m", "");
  text = text.replaceAll("\u001b[1m", "");
  text = text.replaceAll("\u001b[4m", "");
  const index_of_filename_ext = text.indexOf(".c2po");
  const index_of_filename = text.substring(0,index_of_filename_ext).indexOf("] ")+2;
  if (index_of_filename_ext != -1){
    text = text.replaceAll(text.substring(index_of_filename, index_of_filename_ext+6), "");
  }
  const index_of_line_num = text.indexOf(":");
  if (index_of_filename_ext != -1){
    text = text.replaceAll(text.substring(index_of_filename, index_of_line_num+1), "");
  }
  return text;
}

function upload_c2po() {
  var reader = new FileReader();
  reader.readAsText(document.getElementById("C2POUploadFile").files[0]);
  reader.onload = (e) => {
    const result = e.target.result; // Access result here
    editor.setValue(result); 
  };
}

function upload_csv() {
  var reader = new FileReader();
  reader.readAsText(document.getElementById("CSVUploadFile").files[0]);
  reader.onload = (e) => {
    const result = e.target.result; // Access result here
    editor3.setValue(result); 
  };
}

function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

function downloadC2POFile(){
  download('specification.c2po', editor.getValue());
}

function downloadCSVFile(){
  download('trace.csv', editor3.getValue());
}

function downloadOutputLog(){
  download('r2u2_output.log', editor4.getValue());
}

function downloadMemoryBounds(){
  download('r2u2_memory_usage.txt', editor5.getValue());
}

function downloadGraph(){
  var spec_name = document.getElementById("graphSpecSelection").textContent;
  if (spec_name.includes("Select Specification")){
    return;
  }
  var element = document.createElement('a');

  var serializer = new XMLSerializer();
  var xmlString = serializer.serializeToString(d3.select("#graph-container").selectAll("svg").node());

  element.setAttribute("href-lang", "image/svg+xml")
  element.setAttribute("href", "data:image/svg+xml;base64,\n" + btoa(xmlString));

  element.setAttribute('download', spec_name + "_graph.svg");

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

function downloadAST(){
  var spec_name = document.getElementById("treeSpecSelection").textContent;
  if (spec_name.includes("Select Specification")){
    return;
  }

  var element = document.createElement('a');

  var serializer = new XMLSerializer();
  var xmlString = serializer.serializeToString(d3.select("#ast-container").selectAll("svg").node());

  element.setAttribute("href-lang", "image/svg+xml")
  element.setAttribute("href", "data:image/svg+xml;base64,\n" + btoa(xmlString));

  element.setAttribute('download', spec_name + "_tree.svg");

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

function downloadSpecBin(){
  const request = {
    booleanizer_enabled: document.getElementById('BooleanizerEnabled').checked,
    aux_enabled: document.getElementById('AuxEnabled').checked,
    rewrite_enabled: document.getElementById('RewriteEnabled').checked,
    cse_enabled: document.getElementById('CSEEnabled').checked,
    sat_enabled: document.getElementById('SATEnabled').checked,
    sat_timeout: Number(document.getElementById('SATTimeout').value),
    c2po_text: editor.getValue(),
    trace_text: editor3.getValue()
}

//console.log(JSON.stringify(request))

fetch('http://0.0.0.0:443/downloadbin', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(request),
})
.then(response => {
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json(); // Assuming the response is in JSON format
})
.then(data => {
  // Handle the response data
  if (data.error){
    if (data.assembly_text === "" )
      editor4.setValue("Unknown compilation error! Please check C2PO Specification format.");
    else
      editor4.setValue(remove_ansi_codes(data.assembly_text));
    editor2.setValue("");
  } else {
    editor2.setValue(remove_ansi_codes(data.assembly_text));
    download('spec.bin', data.download_text);
  }
})
.catch(error => {
  // Handle errors
  console.error('There was a problem with the fetch operation:', error);
});
}

function downloadCArray(){
  const request = {
    booleanizer_enabled: document.getElementById('BooleanizerEnabled').checked,
    aux_enabled: document.getElementById('AuxEnabled').checked,
    rewrite_enabled: document.getElementById('RewriteEnabled').checked,
    cse_enabled: document.getElementById('CSEEnabled').checked,
    sat_enabled: document.getElementById('SATEnabled').checked,
    sat_timeout: Number(document.getElementById('SATTimeout').value),
    c2po_text: editor.getValue(),
    trace_text: editor3.getValue()
}

//console.log(JSON.stringify(request))

fetch('http://0.0.0.0:443/downloadc', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(request),
})
.then(response => {
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json(); // Assuming the response is in JSON format
})
.then(data => {
  // Handle the response data
  if (data.error){
    if (data.assembly_text === "" )
      editor4.setValue("Unknown compilation error! Please check C2PO Specification format.");
    else
      editor4.setValue(remove_ansi_codes(data.assembly_text));
    editor2.setValue("");
  } else {
    editor2.setValue(remove_ansi_codes(data.assembly_text));
    download('spec.h', data.download_text);
  }
})
.catch(error => {
  // Handle errors
  console.error('There was a problem with the fetch operation:', error);
});
}

function downloadRustArray(){
  const request = {
    booleanizer_enabled: document.getElementById('BooleanizerEnabled').checked,
    aux_enabled: document.getElementById('AuxEnabled').checked,
    rewrite_enabled: document.getElementById('RewriteEnabled').checked,
    cse_enabled: document.getElementById('CSEEnabled').checked,
    sat_enabled: document.getElementById('SATEnabled').checked,
    sat_timeout: Number(document.getElementById('SATTimeout').value),
    c2po_text: editor.getValue(),
    trace_text: editor3.getValue()
}

//console.log(JSON.stringify(request))

fetch('http://0.0.0.0:443/downloadrust', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(request),
})
.then(response => {
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json(); // Assuming the response is in JSON format
})
.then(data => {
  // Handle the response data
  if (data.error){
    if (data.assembly_text === "" )
      editor4.setValue("Unknown compilation error! Please check C2PO Specification format.");
    else
      editor4.setValue(remove_ansi_codes(data.assembly_text));
    editor2.setValue("");
  } else {
    editor2.setValue(remove_ansi_codes(data.assembly_text));
    download('spec.rs', data.download_text);
  }
})
.catch(error => {
  // Handle errors
  console.error('There was a problem with the fetch operation:', error);
});
}

function downloadCBounds(){
  const request = {
    booleanizer_enabled: document.getElementById('BooleanizerEnabled').checked,
    aux_enabled: document.getElementById('AuxEnabled').checked,
    rewrite_enabled: document.getElementById('RewriteEnabled').checked,
    cse_enabled: document.getElementById('CSEEnabled').checked,
    sat_enabled: false,
    sat_timeout: 0,
    c2po_text: editor.getValue(),
    trace_text: editor3.getValue()
}

//console.log(JSON.stringify(request))

fetch('http://0.0.0.0:443/downloadcbounds', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(request),
})
.then(response => {
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json(); // Assuming the response is in JSON format
})
.then(data => {
  // Handle the response data
  if (data.error){
    if (data.assembly_text === "" )
      editor4.setValue("Unknown compilation error! Please check C2PO Specification format.");
    else
      editor4.setValue(remove_ansi_codes(data.assembly_text));
    editor2.setValue("");
  } else {
    editor2.setValue(remove_ansi_codes(data.assembly_text));
    download('bounds.h', data.download_text);
  }
})
.catch(error => {
  // Handle errors
  console.error('There was a problem with the fetch operation:', error);
});
}

function downloadRustBounds(){
  const request = {
    booleanizer_enabled: document.getElementById('BooleanizerEnabled').checked,
    aux_enabled: document.getElementById('AuxEnabled').checked,
    rewrite_enabled: document.getElementById('RewriteEnabled').checked,
    cse_enabled: document.getElementById('CSEEnabled').checked,
    sat_enabled: false,
    sat_timeout: 0,
    c2po_text: editor.getValue(),
    trace_text: editor3.getValue()
}

//console.log(JSON.stringify(request))

fetch('http://0.0.0.0:443/downloadrustbounds', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(request),
})
.then(response => {
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json(); // Assuming the response is in JSON format
})
.then(data => {
  // Handle the response data
  if (data.error){
    if (data.assembly_text === "" )
      editor4.setValue("Unknown compilation error! Please check C2PO Specification format.");
    else
      editor4.setValue(remove_ansi_codes(data.assembly_text));
    editor2.setValue("");
  } else {
    editor2.setValue(remove_ansi_codes(data.assembly_text));
    download('config.toml', data.download_text);
  }
})
.catch(error => {
  // Handle errors
  console.error('There was a problem with the fetch operation:', error);
});
}

function generate_output_txt(){
  var output_txt = "";
  var prev_timestamp = 0;
  var j = 0;
  for (var i = 0; i < globalVerdicts.length; i++) {
    if (globalVerdicts[i].timestamp_produced <= globalTimestamps[Math.min(curr_step - 1, globalTimestamps.length - 1)]){
      if (document.getElementById('AuxEnabled').checked) {
        output_txt = output_txt + globalVerdicts[i].spec_str + ":" + globalVerdicts[i].time_index + "," + globalVerdicts[i].truth + "\r\n";
      } else {
        output_txt = output_txt + globalVerdicts[i].spec_num + ":" + globalVerdicts[i].time_index + "," + globalVerdicts[i].truth + "\r\n";
      }

      if (document.getElementById('AuxEnabled').checked && 
            (globalVerdicts[i].timestamp_produced != globalVerdicts[Math.min(i+1, globalVerdicts.length - 1)].timestamp_produced ||
                i == globalVerdicts.length - 1)){
        prev_timestamp = globalVerdicts[i].timestamp_produced;
        while (j < globalContracts.length) {
          if (globalContracts[j].timestamp_produced > globalVerdicts[i].timestamp_produced){
            break;
          }
          output_txt = output_txt + "Contract " + globalContracts[j].spec_str;
          if (globalContracts[j].truth == 2)
            output_txt = output_txt + " verified ";
          else if (globalContracts[j].truth == 1)
            output_txt = output_txt + " invalid ";
          else 
            output_txt = output_txt + " inactive ";
          output_txt = output_txt + "at " + globalContracts[j].time_index + "\r\n";
          j++;
        }
      }
    }
  }
  editor4.setValue(output_txt);
  editor4.refresh();
}

function compile(){
  reset();
  const request = {
      booleanizer_enabled: document.getElementById('BooleanizerEnabled').checked,
      aux_enabled: document.getElementById('AuxEnabled').checked,
      rewrite_enabled: document.getElementById('RewriteEnabled').checked,
      cse_enabled: document.getElementById('CSEEnabled').checked,
      sat_enabled: document.getElementById('SATEnabled').checked,
      sat_timeout: Number(document.getElementById('SATTimeout').value),
      c2po_text: editor.getValue(),
      trace_text: editor3.getValue()
  }

  //console.log(JSON.stringify(request))

  fetch('http://0.0.0.0:443/compile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request),
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json(); // Assuming the response is in JSON format
  })
  .then(data => {
    // Handle the response data
    if (data.error){
      if (data.assembly_text === "" )
        editor4.setValue("Unknown compilation error! Please check C2PO Specification format.");
      else
        editor4.setValue(remove_ansi_codes(data.assembly_text));
      editor2.setValue("");
    } else {
      update_globals(data);
      editor2.setValue(remove_ansi_codes(data.assembly_text));
      editor4.setValue("");
    }
  })
  .catch(error => {
    // Handle errors
    console.error('There was a problem with the fetch operation:', error);
  });

}

async function step(){
  if (curr_step == -1){
    editor4.setValue("");
    editor4.refresh();
    const request = {
      booleanizer_enabled: document.getElementById('BooleanizerEnabled').checked,
      aux_enabled: document.getElementById('AuxEnabled').checked,
      rewrite_enabled: document.getElementById('RewriteEnabled').checked,
      cse_enabled: document.getElementById('CSEEnabled').checked,
      sat_enabled: document.getElementById('SATEnabled').checked,
      sat_timeout: Number(document.getElementById('SATTimeout').value),
      c2po_text: editor.getValue(),
      trace_text: editor3.getValue()
    }

    await fetch('http://0.0.0.0:443/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json(); // Assuming the response is in JSON format
    })
    .then(data => {
      // Handle the response data
      if (data.error){
        if (data.assembly_text === "" )
          editor4.setValue("Unknown compilation error! Please check C2PO Specification format.");
        else
          editor4.setValue(remove_ansi_codes(data.assembly_text));
        editor2.setValue("");
        return;
      } else {
        editor2.setValue(remove_ansi_codes(data.assembly_text));
        update_globals(data);
        curr_step = 0;
      }
    })
    .catch(error => {
      // Handle errors
      console.error('There was a problem with the fetch operation:', error);
    });
  }
  if (curr_step != -1) {
    editor3.removeLineClass(curr_step);
    editor3.addLineClass(curr_step+1, "wrap", 'CodeMirror-activeline-background');
    if (curr_step+1 >= editor3.lineCount()) {
      curr_step = 0;
      return;
    } else{
      curr_step = curr_step + 1;
    }
    generate_output_txt();
    maxIndex = get_curr_max_index();
    document.getElementById("IntervalStart").value = 0;
    document.getElementById("IntervalEnd").value = maxIndex;
    change_graph();
  }
}

async function step_back(){
  if (curr_step > 0) {
    editor3.removeLineClass(curr_step);
    editor3.addLineClass(curr_step-1, "wrap", 'CodeMirror-activeline-background');
    curr_step = curr_step - 1;
    generate_output_txt();
    maxIndex = get_curr_max_index();
    document.getElementById("IntervalStart").value = 0;
    document.getElementById("IntervalEnd").value = maxIndex;
    change_graph();
  } else if (curr_step == 0) {
    editor3.removeLineClass(curr_step);
    curr_step = globalTimestamps.length+1;
  }
}

function get_curr_max_index(){
  var max = 0;
  for (var i = 0; i < globalVerdicts.length; i++) {
    if (globalVerdicts[i].timestamp_produced <= globalTimestamps[Math.min(curr_step - 1, globalTimestamps.length - 1)]) {
      max = Math.max(max, globalVerdicts[i].time_index);
    }
  }
  return max;
}

function run(){
  reset();
  const request = {
      booleanizer_enabled: document.getElementById('BooleanizerEnabled').checked,
      aux_enabled: document.getElementById('AuxEnabled').checked,
      rewrite_enabled: document.getElementById('RewriteEnabled').checked,
      cse_enabled: document.getElementById('CSEEnabled').checked,
      sat_enabled: document.getElementById('SATEnabled').checked,
      sat_timeout: Number(document.getElementById('SATTimeout').value),
      c2po_text: editor.getValue(),
      trace_text: editor3.getValue()
  }

  //console.log(JSON.stringify(request))

  fetch('http://0.0.0.0:443/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request),
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json(); // Assuming the response is in JSON format
  })
  .then(data => {
    // Handle the response data
    if (data.error){
      if (data.assembly_text === "" )
        editor4.setValue("Unknown compilation error! Please check C2PO Specification format.");
      else
        editor4.setValue(remove_ansi_codes(data.assembly_text));
      editor2.setValue("");
    } else {
      update_globals(data);
      editor2.setValue(remove_ansi_codes(data.assembly_text));
      curr_step = globalTimestamps.length+1;
      generate_output_txt();
      document.getElementById("IntervalStart").value = 0;
      maxIndex = d3.max(Array.from(globalVerdicts.values()), d => Math.floor(d.time_index));
      document.getElementById("IntervalEnd").value = maxIndex;
      change_graph();
    }
  })
  .catch(error => {
    // Handle errors
    console.error('There was a problem with the fetch operation:', error);
  });

}

function load_temporal_example() {
  editor.setValue("INPUT\r\n\ts0,s1,s2: bool;\r\n\r\nFTSPEC\r\n\tSPEC0: G[1,2] (s0 || s1);\r\n\tSPEC1: s0 U[0,2] (s1 && s2);\r\n\tSPEC2: (F[0,1] s0) R[0,1] s1;\r\n\t\r\nPTSPEC\r\n\tSPEC3: H[1,2] (s0 || s1);\r\n\tSPEC4: s0 S[0,2] (s1 && s2);\r\n\tSPEC5: (O[0,1] s0) T[0,1] s1;\r\n");
  editor3.setValue("# s0,s1,s2\r\n0,0,0\r\n1,0,0\r\n0,1,0\r\n1,1,0\r\n0,0,1\r\n1,0,1\r\n0,1,1\r\n1,1,1\r\n");
}

function load_AGC_example() {
  editor.setValue("INPUT\r\n\tb0,b1: bool;\r\n\r\nFTSPEC\r\n\tcontract: b0 => b1;\r\n");
  editor3.setValue("# b0,b1\r\n0,0\r\n1,0\r\n0,1\r\n1,1\r\n");
}

function load_set_aggregation_example() {
  editor.setValue("INPUT\r\n\tb0,b1,b2: bool;\n\nDEFINE\r\n\tn := 1;\n\nFTSPEC\r\n\tforeach(b:{b0,b1,b2})(b);\r\n\tforsome(b:{b0,b1,b2})(b);\r\n\tforexactly(b:{b0,b1,b2},n)(b);\r\n\tforatleast(b:{b0,b1,b2},n)(b);\r\n\tforatmost(b:{b0,b1,b2},n)(b);\r\n");
  editor3.setValue("# b0,b1,b2\r\n0,0,0\r\n1,0,0\r\n0,1,0\r\n1,1,0\r\n0,0,1\r\n1,0,1\r\n0,1,1\r\n1,1,1\r\n");
}

function load_array_example() {
  editor.setValue("STRUCT\r\n\tTest: { I: int[]; };\r\n\r\nINPUT\r\n\ti0,i1,i2: int;\r\n\r\nDEFINE\r\n\ts := {i0,i1,i2};\r\n\tt := Test(s);\r\n\r\nFTSPEC\r\n\tforeach(i:t.I)(i > 5);\r\n");
  editor3.setValue("# i0,i1,i2\r\n0,0,0\r\n0,6,6\r\n5,5,5\r\n6,6,6\r\n");
}

function load_struct_example() {
  editor.setValue("STRUCT\r\n\tTest: { m1,m2: bool; };\r\n\r\nINPUT\r\n\tb0,b1: bool;\r\n\r\nDEFINE\r\n\tt := Test(b0,b1);\r\n\r\nFTSPEC\r\n\tt.m1;\r\n\tt.m2;\r\n");
  editor3.setValue("# b0,b1\r\n0,0\r\n1,0\r\n0,1\r\n1,1\r\n");
}

function change_sat_option(swtch) {
  var timeout_form = document.getElementById("SATTimeout");
  if (swtch.checked == true) {
      timeout_form.disabled = false;
  } else {
      timeout_form.disabled = true;
  }
}

function change_interval_start(number) {
  if (currVerdicts.length == 0) {
    number.value = 0;
    return;
  }
  if (parseInt(number.value) < 0){
    number.value = 0;
  }
  if (parseInt(number.value) > maxIndex){
    number.value = maxIndex;
  }
  const end = parseInt(document.getElementById("IntervalEnd").value);
  if (end < parseInt(number.value)) {
    number.value = end;
  }
  change_graph();
}

function change_interval_end(number) {
  if (currVerdicts.length == 0) {
    number.value = 0;
    return;
  }
  if (parseInt(number.value) < 0){
    number.value = 0;
  }
  if (parseInt(number.value) > maxIndex){
    number.value = maxIndex;
  }
  const start = parseInt(document.getElementById("IntervalStart").value);
  if (start > parseInt(number.value)) {
    number.value = start;
  }
  change_graph();
}

function change_bz_option() {
  reset();
  editor2.setValue("");
}

function change_aux_option() {
  reset();
  editor2.setValue("");
}

function change_rewrite_option() {
  reset();
  editor2.setValue("");
}

function change_cse_option() {
  reset();
  editor2.setValue("");
}

var used_bz_instructions = []; // only used when not using CSE

function find_children(parent, data, child){
  var assembly_lines = data.assembly_text.split("\n");
  for (var i = assembly_lines.length - 1; i >= 0; i--) { // Iterate backwards through instructions
    if (assembly_lines[i].startsWith("[")){
      continue;
    }
    var assembly_line = assembly_lines[i].split(/\s+/);
    if (assembly_line[0] == "TL" && assembly_line[2] != "return"){ // Return instructions are never a children
      if (assembly_line[1] == child){
        const childNode = new TreeNode({engine: "TL", instr: assembly_line[2], instr_num: assembly_line[1], parents: [get_instr_name(parent)], op0: assembly_line[3], op1: assembly_line[4]});
        parent.addChild(childNode);
        if (childNode.data.op1 != undefined){
          find_children(childNode, data, childNode.data.op1);
        }
        find_children(childNode, data, childNode.data.op0);
      }
    } else if (parent.data.instr == "load" && assembly_line[0] == "BZ" && assembly_line[2] == "store" && ("a" + assembly_line[4]) == child){
      const childNode = new TreeNode({engine: "BZ", instr: assembly_line[2], instr_num: assembly_line[1], parents: [get_instr_name(parent)], op0: assembly_line[3], op1:  assembly_line[4]});
      // Since TL engine pulls from atomic vector, it doesn't map directly back to BZ instruction.
      // Therefore, if CSE is disabled, we need to keep track of the BZ store isntructions to accurately
      // display the AST. And if CSE is enabled, we need to keep track of the BZ store instructions as currently
      // both past-time and future-time might have similar but technically different TL LOAD atomic instructions.
      if (!document.getElementById('CSEEnabled').checked){
        if (used_bz_instructions.includes(childNode.data.instr_num)){
          continue;
        } else {
          used_bz_instructions.push(childNode.data.instr_num);
        }
      } 
      else {
        if (getFirstElements(used_bz_instructions).includes(parent.data.instr_num)){
          var child_idx = getFirstElements(used_bz_instructions).findIndex(element => element == parent.data.instr_num);
          if (childNode.data.instr_num != used_bz_instructions[child_idx][1].data.instr_num){
            continue;
          }
        } else if (getChildrenNumbers(used_bz_instructions).includes(childNode.data.instr_num)){
          continue;
        } else {
          used_bz_instructions.push([parent.data.instr_num, childNode]);
        }
        function getFirstElements(arr) {
          return arr.map(tuple => tuple[0]);
        }
        function getChildrenNumbers(arr) {
          return arr.map(tuple => tuple[1].data.instr_num);
        }
      }
      parent.addChild(childNode);
      find_children(childNode, data, childNode.data.op0);
      return;
    } else if (assembly_line[0] == "BZ" && parent.data.engine == "BZ"){
      if (assembly_line[1] == ("b" + child))
      {
        if (parent.data.instr == "store"){
          const childNode = new TreeNode({engine: "BZ", instr: assembly_line[2], instr_num: assembly_line[1], parents: [get_instr_name(parent)], op0: assembly_line[3], op1: assembly_line[4]});
          parent.addChild(childNode);
          if (!assembly_line[2].includes("load")){
            if (childNode.data.op1 != undefined){
              find_children(childNode, data, childNode.data.op1);
            }
            find_children(childNode, data, childNode.data.op0);
          }
        } 
        else {
          const childNode = new TreeNode({engine: "BZ", instr: assembly_line[2], instr_num: assembly_line[1], parents: [get_instr_name(parent)], op0: assembly_line[3], op1: assembly_line[4]});
          parent.addChild(childNode, childNode.data.op0);
          if (!assembly_line[2].includes("load") && !assembly_line[2].includes("const") && !assembly_line[2].includes("ts")){
            if (childNode.data.op1 != undefined){
              find_children(childNode, data, childNode.data.op1);
            }
            find_children(childNode, data, childNode.data.op0);
          }
        }
      }
    }
  }
}
function get_instr_name(node){
  var name = node.data.instr_num + " " + node.data.instr + " " + node.data.op0;
  if (node.data.op1 != undefined){
    name = name + " " + node.data.op1;
  }
  return name;
}

function update_globals(data) {
  reset_globals();
  globalVerdicts = data.verdicts;
  globalContracts = data.contracts;

  var assembly_lines = data.assembly_text.split("\n");
  for (var i = 0; i < assembly_lines.length; i++) { // Set global spec map based on auxiliary data in assembly
    var assembly_line = assembly_lines[i].split(/\s+/);
    if (assembly_line[0] == "F"){
      globalSpecMap.set(assembly_line[1], parseInt(assembly_line[2]));
      globalSpecMapReverse.set(parseInt(assembly_line[2]), assembly_line[1]);
    }
    else if (assembly_line[0] == "C"){
      globalContractMap.set(assembly_line[1], [parseInt(assembly_line[2]), parseInt(assembly_line[3]), parseInt(assembly_line[4])]);
    }
  }
  if (globalSpecMap.size == 0) { // Auxiliary data may be disabled
    for (var i = 0; i < assembly_lines.length; i++) { // Set global spec map based on TL return instructions
      var assembly_line = assembly_lines[i].split(/\s+/);
      if (assembly_line[0] == "TL" && assembly_line[2] == "return"){
        globalSpecMap.set(assembly_line[4], parseInt(assembly_line[4]));
        globalSpecMapReverse.set(parseInt(assembly_line[4]), assembly_line[4]);
      }
    }
  }

  // Construct dependency tree
  // used_bz_instructions = [];
  for (var i = assembly_lines.length - 1; i >= 0; i--) { // Iterate backwards through instructions
    var assembly_line = assembly_lines[i].split(/\s+/);
    if (assembly_line[0] == "TL" && assembly_line[2] == "return"){
      const tree = new Tree({engine: "TL", instr: "return", instr_num: assembly_line[1], parents: null, op0: assembly_line[3], op1: assembly_line[4]});
      globalTree.splice(tree.op2,0,tree); // Add roots at spec_num index
      find_children(tree.root, data, tree.root.data.op0); // Find children
    }
  }
  change_ast();

  var list = document.getElementById("graphSpecSelection_menu");
  list.innerHTML = ' '; // remove all prior specs 
  var specs = Array.from(globalSpecMap.keys());
  specs.push(...Array.from(globalContractMap.keys()));

  for (var i = 0; i < specs.length; i++){                
      var opt = specs[i];  
      var li = document.createElement("li");
      var link = document.createElement("a");             
      var text = document.createTextNode(opt);
      link.className = "dropdown-item";
      link.setAttribute("onclick", "showGraphSpec(this)");
      link.appendChild(text);
      li.appendChild(link);
      list.appendChild(li);
  }

  var list = document.getElementById("treeSpecSelection_menu");
  list.innerHTML = ' '; // remove all prior specs 
  var specs = Array.from(globalSpecMap.keys());
  specs.push("All Specifications");

  for (var i = 0; i < specs.length; i++){                
      var opt = specs[i];  
      var li = document.createElement("li");
      var link = document.createElement("a");             
      var text = document.createTextNode(opt);
      link.className = "dropdown-item";
      link.setAttribute("onclick", "showTreeSpec(this)");
      link.appendChild(text);
      li.appendChild(link);
      list.appendChild(li);
  }

  var trace_lines = editor3.getValue().split("\n");
  for (var i = 1; i < trace_lines.length; i++) { // Set global timestamps based on CSV Trace 
    var trace_line = trace_lines[i].split(/\s+/);
    if (trace_line[0].charAt(0) == "@"){
      globalTimestamps.push(parseInt(trace_line[0].substring(1)));
    } else if (trace_line[0] != ""){
      if (globalTimestamps.length == 0)
        globalTimestamps.push(0);
      else 
        globalTimestamps.push(globalTimestamps[globalTimestamps.length-1]+1);
    }
  }

  // Provide statistical data based on assembly text
  var aux_bytes_length = 0;
  var bz_instructions = 0;
  var tl_instructions = 0;
  var num_temporal = 0;
  var num_formulas = 0;
  var num_contracts = 0;
  var num_signals = 1;
  var num_atomics = 1;
  var num_specs = 0;
  var total_scq_size = 0;
  for (var i = 0; i < assembly_lines.length; i++) { 
    var assembly_line = assembly_lines[i].split(/\s+/);
    if (assembly_line[0] == "BZ"){
      bz_instructions += 1;
      if(assembly_line[2].includes("load")){
        num_signals = Math.max(num_signals, parseInt(assembly_line[3])+1);
      }
    } else if (assembly_line[0] == "TL"){
      tl_instructions += 1;
      if(assembly_line[2] == "return"){
        num_specs += 1;
      } else if (assembly_line[2] == "load"){
        num_atomics = Math.max(num_atomics, parseInt(assembly_line[3].substring(1))+1);
      }
    } else if(assembly_line[0] == "CG" && assembly_line[1] == "TL"){
      if (assembly_line[2] == "SCQ"){
        total_scq_size += parseInt(assembly_line[4].substring(1,assembly_line[4].length-1));
      } else if (assembly_line[2] == "TEMP"){
        num_temporal += 1;
      }
    }
    else if (assembly_line[0] == "F"){
      aux_bytes_length += assembly_line[1].length;
      num_formulas += 1;
    }
    else if (assembly_line[0] == "C"){
      aux_bytes_length += assembly_line[1].length;
      num_contracts += 1;
    }
  }
  var stat_string = "";
  var total_c_memory = 112; // Fixed overhead (e.g., program counters and pointers)
  var total_rust_memory = 52; // Fixed overhead (e.g., program counters and overflow flag)
  if (document.getElementById('BooleanizerEnabled').checked){
    stat_string += "Total Number of Incoming Signals: " + num_signals + "\r\n";
    stat_string += "Total Number of Booleanizer Instructions: " + bz_instructions + "\r\n"; 
    total_c_memory += (8 * num_signals); // Memory required to store input signal_vector
    total_c_memory += (16 * bz_instructions); // Memory required to store BZ instruction table
    total_c_memory += (8 * bz_instructions); // Memory required to store internal value_vector
    total_rust_memory += (16 * num_signals); // Memory required to store input signal_vector
    total_rust_memory += (16 * bz_instructions); // Memory required to store BZ instruction table
    total_rust_memory += (16 * bz_instructions); // Memory required to store internal value_vector
  }
  stat_string += "Total Number of Atomic Propositions: " + num_atomics + "\r\n";
  stat_string += "Total Number of Temporal Logic Instructions: " + tl_instructions + "\r\n"; 
  total_c_memory += (1 * num_atomics); // Memory required to store atomic_vector
  total_c_memory += (16 * tl_instructions); // Memory required to store TL instruction table
  total_rust_memory += (1 * num_atomics); // Memory required to store atomic_vector
  total_rust_memory += (16 * tl_instructions); // Memory required to store TL instruction table
  if (document.getElementById('AuxEnabled').checked){
    stat_string += "Total Number of Formulas: " + num_formulas + "\r\n";
    if (num_contracts > 0){
      stat_string += "Total Number of Assume Guarantee Contracts: " + num_contracts + "\r\n";
    }
    total_c_memory += 40; // Fixed overhead of r2u2_info_arena_t
    total_c_memory += ((16 * num_formulas) + (24 * num_contracts) + (1 * aux_bytes_length)); // Memory required to store aux data
    total_rust_memory += ((68 * num_formulas) + (76 * num_contracts)); // Memory required to store aux data
    total_rust_memory += ((72 * num_contracts) + 8); // Size of output contract buffer
    total_rust_memory += ((76 * num_specs * 2) + 8); // Size of output verdict buffer
  } else {
    stat_string += "Total Number of Specifications: " + num_specs + "\r\n";
    total_rust_memory += ((12 * num_specs * 2) + 8); // Size of output verdict buffer
  }
  stat_string += "Total Number of Shared Connection Queue (SCQ) Slots: " + total_scq_size + "\r\n";
  total_c_memory += ((32 * tl_instructions) + (4 * (total_scq_size + (num_temporal * 4)))); // Memory required for SCQ arena
  total_rust_memory += ((48 * tl_instructions) + (8 * total_scq_size)); // Memory required for SCQ arena
  stat_string += "--------------------------------------------------------------------------\r\n";
  stat_string += "Estimated* Memory for R2U2 Monitor Struct in C: " + total_c_memory + " bytes\r\n";
  stat_string += "Estimated* Memory for R2U2 Monitor Struct in Rust: " + total_rust_memory + " bytes\r\n";
  stat_string += "--------------------------------------------------------------------------\r\n";
  stat_string += "*Note: This is only an estimate (based on a 64-bit architecture).\r\n\t\tActual usage may be different based on architecture and padding.";
  editor5.setValue(stat_string);
}

function reset_globals() {
  globalVerdicts = [];
  globalContracts = [];
  globalSpecMap = new Map();
  globalSpecMapReverse = new Map();
  globalContractMap = new Map();
  globalTimestamps = [];
  currVerdicts = new Map();
  globalTree = [];
  remove_additional_graphs();
}

function reset() {
  if (curr_step != 1) {
    editor3.removeLineClass(curr_step);
    editor3.refresh();
    editor4.setValue("");
    editor5.setValue("");
    curr_step = -1;
  }
  var list = document.getElementById("graphSpecSelection_menu");
  list.innerHTML = ' '; // remove all prior specs 
  document.getElementById("graphSpecSelection").textContent = "Select Specification";
  var list = document.getElementById("treeSpecSelection_menu");
  list.innerHTML = ' '; // remove all prior specs 
  document.getElementById("treeSpecSelection").textContent = "Select Specification";
  svg.style("opacity", 0);
  ast.style("opacity", 0);
  reset_globals();
}

function showGraphSpec(selected) {
  document.getElementById("graphSpecSelection").textContent = selected.textContent;
  remove_additional_graphs();
  currVerdicts = new Map();
  change_graph();
}

function showTreeSpec(selected) {
  document.getElementById("treeSpecSelection").textContent = selected.textContent;
  change_ast();
}

// Create Graph Visualization with d3.js
const ast_margin = {top: 40, right: 80, bottom: 40, left: 80};
const ast_width = 1500 - ast_margin.left - ast_margin.right;
const ast_height = 500;

function handleZoom(event) {
  d3.select('#ast-drawarea')
    .attr('transform', event.transform);
}

var ast = d3.select("#ast-container")
  .append("svg")
    .attr("viewBox", `0 0 ${ast_width + ast_margin.left + ast_margin.right} ${ast_height + ast_margin.top + ast_margin.bottom}`)
    .attr("id", "ast")
    .call(d3.zoom()
      .on("zoom",handleZoom))
  .append("g")
    .attr("id", "ast-drawarea")
    .attr("cursor", "grab")
    .attr("transform", `translate(${ast_margin.left}, ${ast_margin.top})`);

// Define arrow end point
const arrowPoints = [[0, 0], [0, 10], [10, 5]];
ast.append('defs')
  .append('marker')
  .attr('id', 'arrow')
  .attr('viewBox', [0, 0, 10, 10])
  .attr('refX', 5)
  .attr('refY', 5)
  .attr('markerWidth', 5)
  .attr('markerHeight', 5)
  .attr('orient', 'auto-start-reverse')
  .append('path')
  .attr('d', d3.line()(arrowPoints))
  .attr('stroke', 'black');

// Define tooltip
const tooltip = d3.select("#ast-container")
  .append("div")
  .style("opacity", 0)
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("background-color", "#ddd")
  .style("color", "black")
  .style("border", "solid")
  .style("border-width", "2px")
  .style("border-color", "#bbb")
  .style("border-radius", "5px")
  .style("padding", "10px")

function showNodeTip(event, d){
  tooltip
      .transition()
      .duration(100)
      .style("opacity", 1)

  var html_txt = "Engine: " + d.data.data.engine;
  if (d.data.data.engine === "BZ"){
    html_txt += " (Booleanizer)";
  } else if (d.data.data.engine === "TL"){
    html_txt += " (Temporal Logic)";
  }
  html_txt += "<br>Instruction #: " + d.data.data.instr_num + "<br>Operator: " + d.data.data.instr;
  if(d.data.data.instr === "load"){
    html_txt += " (Load Atomic)"
  } 
  else if (d.data.data.instr === "fload") {
    html_txt += " (Load Float Signal)";
  } else if (d.data.data.instr === "iload"){
    html_txt += " (Load Integer or Boolean Signal)";
  } else if (d.data.data.instr === "ts") {
    html_txt += " (Current Monitor Timestamp)"
  } else if (d.data.data.instr === "store") {
    html_txt += " (Store Atomic)"
  } else if (d.data.data.instr === "iconst"){
    html_txt += " (Load Integer Constant Value)";
  } else if (d.data.data.instr === "fconst"){
    html_txt += " (Load Float Constant Value)";
  } else if (d.data.data.instr === "bwneg"){
    html_txt += " (Bitwise NEGATION)";
  } else if (d.data.data.instr === "bwand"){
    html_txt += " (Bitwise AND)";
  } else if (d.data.data.instr === "bwor"){
    html_txt += " (Bitwise OR)";
  } else if (d.data.data.instr === "bwxor"){
    html_txt += " (Bitwise XOR)";
  } else if (d.data.data.instr === "ieq"){
    html_txt += " (Integer Equal)";
  } else if (d.data.data.instr === "feq"){
    html_txt += " (Float Equal)";
  } else if (d.data.data.instr === "ineq"){
    html_txt += " (Integer Not Equal)";
  } else if (d.data.data.instr === "fneq"){
    html_txt += " (Float Not Equal)";
  } else if (d.data.data.instr === "igt") {
    html_txt += " (Integer Greater Than)";
  } else if (d.data.data.instr === "fgt"){
    html_txt += " (Integer Greater Than)";
  } else if (d.data.data.instr === "igte"){
    html_txt += " (Integer Greater Than Or Equal To)";
  } else if (d.data.data.instr === "fgte"){
    html_txt += " (Float Greater Than Or Equal To)";
  } else if (d.data.data.instr === "ilt"){
    html_txt += " (Integer Less Than)";
  } else if (d.data.data.instr === "flt"){
    html_txt += " (Float Greater Than)";
  } else if (d.data.data.instr === "ilte"){
    html_txt += " (Integer Less Than Or Equal To)";
  } else if (d.data.data.instr === "flte"){
    html_txt += " (Integer Less Than Or Equal To)";
  } else if (d.data.data.instr === "ineg"){
    html_txt += " (Integer Negation)";
  } else if (d.data.data.instr === "fneg"){
    html_txt += " (Float Negation)";
  } else if(d.data.data.instr === "isub"){
    html_txt += " (Integer Subtract)";
  } else if (d.data.data.instr === "fsub"){
    html_txt += " (Float Subtract)";
  } else if (d.data.data.instr === "iadd") {
    html_txt += " (Integer Add)";
  } else if (d.data.data.instr === "fadd"){
    html_txt += " (Float Add)";
  } else if (d.data.data.instr === "imul"){
    html_txt += " (Integer Multiply)";
  } else if (d.data.data.instr === "fmul"){
    html_txt += " (Float Multiply)";
  } else if (d.data.data.instr === "idiv"){
    html_txt += " (Integer Divide)";
  } else if (d.data.data.instr === "fdiv"){
    html_txt += " (Float Divide)";
  } else if (d.data.data.instr === "isqrt"){
    html_txt += " (Integer Square Root)";
  } else if (d.data.data.instr === "fsqrt"){
    html_txt += " (Float Square Root)";
  } else if (d.data.data.instr === "iabs"){
    html_txt += " (Integer Absolute Value)";
  } else if (d.data.data.instr === "fabs"){
    html_txt += " (Float Absolute Value)";
  } else if (d.data.data.instr === "ipow"){
    html_txt += " (Integer Power)";
  } else if (d.data.data.instr === "fpow"){
    html_txt += " (Float Power)";
  } else if (d.data.data.instr === "mod"){
    html_txt += " (Modulo)";
  } else if (d.data.data.instr === "prev"){
    html_txt += " (Previous Value)";
  // } else if (d.data.data.instr === "or"){
  //   html_txt += " (OR)";
  // } else if (d.data.data.instr === "and"){
  //   html_txt += " (AND)";
  // } else if (d.data.data.instr === "not"){
  //   html_txt += " (NOT)";
  } else if (d.data.data.instr === "equiv"){
    html_txt += " (EQUIVALENT)";
  } else if (d.data.data.instr === "release") {
    if (d.data.data.op0 === "False"){
      html_txt += " (GLOBALLY)";
    } else {
      html_txt += " (RELEASE)";
    }
  } else if (d.data.data.instr === "until") {
    if (d.data.data.op0 === "True"){
      html_txt += " (FUTURE)";
    } else {
      html_txt += " (UNTIL)";
    }
  } else if (d.data.data.instr === "trigger"){
    if (d.data.data.op0 === "False"){
      html_txt += " (HISTORICALLY)";
    } else {
      html_txt += " (TRIGGER)";
    }
  } else if (d.data.data.instr === "since") {
    if (d.data.data.op0 === "True"){
      html_txt += " (ONCE)";
    } else {
      html_txt += " (SINCE)";
    }
  }
  else if (d.data.data.instr === "return"){
    html_txt += " (Return " + globalSpecMapReverse.get(parseInt(d.data.data.op1)) + ")";
  }

  if(d.data.data.instr === "load"){
    if (!document.getElementById('BooleanizerEnabled').checked){
      const trace_lines = editor3.getValue().split("\n");
      var atomics = (trace_lines[0].substring(1)).split(/\s*,\s*/);
      if (atomics[d.data.data.op0] != undefined){
        html_txt += "<br>Operand: " + atomics[d.data.data.op0].trim();
      } else {
        html_txt += "<br>Operand: " + d.data.data.op0;
      }
    } else {
      html_txt += "<br>Operand: " + d.data.data.op0;
    }
  } else if (d.data.data.instr === "fload" || d.data.data.instr === "iload"){
    const trace_lines = editor3.getValue().split("\n");
    var atomics = (trace_lines[0].substring(1)).split(/\s*,\s*/);
    if (atomics[d.data.data.op0] != undefined){
      html_txt += "<br>Operand: " + atomics[d.data.data.op0].trim();
    } else {
      html_txt += "<br>Operand: " + d.data.data.op0;
    }
  } else if (d.data.data.instr === "store") {
    html_txt += "<br>Store as Atomic a" + d.data.data.op1;
    html_txt += "<br>Operand: b" + d.data.data.op0;
  } else if (d.data.data.instr === "iconst" || d.data.data.instr === "fconst"){
    html_txt += "<br>Constant: " + d.data.data.op0;
  } else if (d.data.data.instr === "ts"){
    html_txt = html_txt;
  } else if (d.data.data.instr === "return"){
    html_txt += "<br>Operand: " + d.data.data.op0;
  } else if (d.data.data.op1 != undefined){
    if (d.data.data.engine == "BZ"){
      html_txt += "<br>Left Operand: b" + d.data.data.op0;
      html_txt += "<br>Right Operand: b" + d.data.data.op1;
    } else {
      html_txt += "<br>Left Operand: " + d.data.data.op0;
      html_txt += "<br>Right Operand: " + d.data.data.op1;
    }
  } else {
    if (d.data.data.engine == "BZ"){
      html_txt += "<br>Operand: b" + d.data.data.op0;
    } else {
      html_txt += "<br>Operand: " + d.data.data.op0;
    }
  }
  const assembly_lines = editor2.getValue().split("\n");
  var search_str = "";
  var cg_line = "";
  if (d.data.data.instr === "release" || d.data.data.instr === "until" || 
    d.data.data.instr === "trigger" || d.data.data.instr === "since") {
    search_str = "CG TL TEMP q" + d.data.data.instr_num.substring(1);
    cg_line = assembly_lines.filter(element => element.includes(search_str))[0];
    const interval = cg_line.substring(search_str.length + 1);
    html_txt += "<br>Interval: " + interval;
  }
  if (d.data.data.engine === "TL"){ 
    search_str = "CG TL SCQ q" + d.data.data.instr_num.substring(1);
    cg_line = assembly_lines.filter(element => element.includes(search_str))[0];
    var queue_size = parseInt(cg_line.substring(search_str.length + 2, cg_line.length-1));
    if (d.data.data.instr === "release" || d.data.data.instr === "until" || 
      d.data.data.instr === "trigger" || d.data.data.instr === "since") {
        queue_size -= 4; // Need to subtract 4 as this is reserved to hold the temporal metadata not the slots
    }
    html_txt += "<br># of Queue Slots: " + queue_size;
  }

  tooltip
    .html(html_txt)
    .style("left", (d3.pointer(event)[0]+20) + "px")
    .style("top", (d3.pointer(event)[1]) + "px")
}

function moveNodeTip(event, d){
  tooltip
    .style("left", (event.pageX+20) + "px")
    .style("top", event.pageY + "px")
}

function hideNodeTip(event, d){
  tooltip
  .transition()
  .duration(100)
  .style("opacity", 0)
}

// Define tree layout
var treeLayout = d3.sugiyama().nodeSize([30,30]).gap([50,50]);

ast.style("opacity", 0);

function change_ast() {
  var spec_name = document.getElementById("treeSpecSelection").textContent;
  if (spec_name.includes("Select Specification")){
    ast.style("opacity", 0);
    return;
  }
  if (globalSpecMap.has(spec_name) || spec_name == "All Specifications"){
    ast.style("opacity", 1);
    d3.select('#ast-drawarea')
      .attr("transform", `translate(${ast_margin.left}, ${ast_margin.top})`);
    var raw_nodes = [];
    if(spec_name == "All Specifications"){
      for (var i = 0; i < globalTree.length; i++){
        raw_nodes.push(globalTree[i].getTree());
      }
      raw_nodes = raw_nodes.flat();
      raw_nodes = prune_nodes(raw_nodes);
    } else {
      var spec = (globalSpecMap.get(spec_name));
      // Format tree data into hierarchy d3 type
      raw_nodes = globalTree[spec].getTree();
    }
    
    const dag = d3.graphStratify()
      .id((d) => get_instr_name(d))
      .parentIds((d) => d.data.parents)
      (raw_nodes);

    treeLayout(dag);

    const nodes = dag.nodes();

    var node = ast.selectAll(".node")
      .data(nodes)

    var nodeEnter = node
      .enter()
      .append("g")
        .attr("class", "node")
        .attr("transform", function (d) {
          return "translate(" + d.x + "," + d.y + ")";
        })
        .call(d3.drag()
          .on("start", dragStarting)
          .on("drag", draggingNode)
          .on("end", dragEnding)
        )
        .on("mouseover", showNodeTip)
        .on("mousemove", moveNodeTip)
        .on("mouseleave", hideNodeTip);

    nodeEnter.append("circle")
      .transition()
      .duration(500)
      .attr("r", 30)
      .attr("fill", function(d) {
        if (d.data.data.engine == "TL"){
          return "#FF0000";
        } else {
          return "#ADADAD";
        }
      });
    
    nodeEnter.append("text")
      .transition()
      .duration(250)
      .style("font-size", "12px")
      .attr('text-anchor', 'middle')

    var nodeUpdate = nodeEnter.merge(node);
    nodeUpdate.transition()
      .duration(1500)
      .attr("transform", function(d) { 
            return "translate(" + d.x + "," + d.y + ")";
        });

    nodeUpdate.select('circle')
      .attr("fill", function(d) {
        if (d.data.data.engine == "TL"){
          return "#FF0000";
        } else {
          return "#ADADAD";
        }
      });

    nodeUpdate.select('text')
      .text(function(d) { 
        if(d.data.data.instr === "load"){
          if (!document.getElementById('BooleanizerEnabled').checked){
            var trace_lines = editor3.getValue().split("\n");
            var atomics = (trace_lines[0].substring(1)).split(/\s*,\s*/);
            if (atomics[d.data.data.op0] != undefined){
              return "LOAD " + atomics[d.data.data.op0].trim();
            } else {
              return "LOAD  " + d.data.data.op0;
            }
          } else {
            return "LOAD " + d.data.data.op0;
          }
        } 
        if (d.data.data.instr === "fload" || d.data.data.instr === "iload"){
          var trace_lines = editor3.getValue().split("\n");
          var atomics = (trace_lines[0].substring(1)).split(/\s*,\s*/);
          if (atomics[d.data.data.op0] != undefined){
            return "LOAD " + atomics[d.data.data.op0].trim();
          } else {
            return "LOAD " + d.data.data.op0;
          }
        } else if (d.data.data.instr === "store") {
          return "STORE a" + d.data.data.op1;
        } else if (d.data.data.instr === "iconst" || d.data.data.instr === "fconst"){
          return "CONST " + d.data.data.op0;
        } else if (d.data.data.instr === "bwneg"){
          return "~";
        } else if (d.data.data.instr === "bwand"){
          return "&";
        } else if (d.data.data.instr === "bwor"){
          return "|";
        } else if (d.data.data.instr === "bwxor"){
          return "^";
        } else if (d.data.data.instr === "ieq" || d.data.data.instr === "feq"){
          return "==";
        } else if (d.data.data.instr === "ineq" || d.data.data.instr === "fneq"){
          return "!=";
        } else if (d.data.data.instr === "igt" || d.data.data.instr === "fgt"){
          return ">";
        } else if (d.data.data.instr === "igte" || d.data.data.instr === "fgte"){
          return ">=";
        } else if (d.data.data.instr === "ilt" || d.data.data.instr === "flt"){
          return "<";
        } else if (d.data.data.instr === "ilte" || d.data.data.instr === "flte"){
          return "<=";
        } else if (d.data.data.instr === "ineg" || d.data.data.instr === "fneg" || 
            d.data.data.instr === "isub" || d.data.data.instr === "fsub"){
          return "-";
        } else if (d.data.data.instr === "iadd" || d.data.data.instr === "fadd"){
          return "+";
        } else if (d.data.data.instr === "imul" || d.data.data.instr === "fmul"){
          return "*";
        } else if (d.data.data.instr === "idiv" || d.data.data.instr === "fdiv"){
          return "÷";
        } else if (d.data.data.instr === "isqrt" || d.data.data.instr === "fsqrt"){
          return "√";
        } else if (d.data.data.instr === "iabs" || d.data.data.instr === "fabs"){
          return "|...|";
        } else if (d.data.data.instr === "ipow" || d.data.data.instr === "fpow"){
          return "POWER";
        } else if (d.data.data.instr === "mod"){
          return "%";
        } else if (d.data.data.instr === "prev"){
          return "PREVIOUS";
        } else if (d.data.data.instr === "or"){
          return "||";
        } else if (d.data.data.instr === "and"){
          return "&&";
        } else if (d.data.data.instr === "not"){
          return "!";
        } else if (d.data.data.instr === "equiv"){
          return "<->";
        } else if (d.data.data.instr === "release") {
          const assembly_lines = editor2.getValue().split("\n");
          const search_str = "CG TL TEMP q" + d.data.data.instr_num.substring(1);
          const cg_line = assembly_lines.filter(element => element.includes(search_str))[0];
          const interval = cg_line.substring(search_str.length + 1);
          if (d.data.data.op0 === "False"){
            return "G" + interval;
          } else {
            return "R" + interval;
          }
        } else if (d.data.data.instr === "until") {
          const assembly_lines = editor2.getValue().split("\n");
          const search_str = "CG TL TEMP q" + d.data.data.instr_num.substring(1);
          const cg_line = assembly_lines.filter(element => element.includes(search_str))[0];
          const interval = cg_line.substring(search_str.length + 1);
          if (d.data.data.op0 === "True"){
            return "F" + interval;
          } else {
            return "U" + interval;
          }
        } else if (d.data.data.instr === "trigger"){
          const assembly_lines = editor2.getValue().split("\n");
          const search_str = "CG TL TEMP q" + d.data.data.instr_num.substring(1);
          const cg_line = assembly_lines.filter(element => element.includes(search_str))[0];
          const interval = cg_line.substring(search_str.length + 1);
          if (d.data.data.op0 === "False"){
            return "H" + interval;
          } else {
            return "T" + interval;
          }
        } else if (d.data.data.instr === "since") {
          const assembly_lines = editor2.getValue().split("\n");
          const search_str = "CG TL TEMP q" + d.data.data.instr_num.substring(1);
          const cg_line = assembly_lines.filter(element => element.includes(search_str))[0];
          const interval = cg_line.substring(search_str.length + 1);
          if (d.data.data.op0 === "True"){
            return "O" + interval;
          } else {
            return "S" + interval;
          }
        }
        else if (d.data.data.instr === "return"){
          return globalSpecMapReverse.get(parseInt(d.data.data.op1));
        } else{
          return d.data.data.instr.toUpperCase();
        }
      });

    // Remove any exiting nodes
    var nodeExit = node.exit()
      .transition()
      .duration(1000)
      .remove();

    // On exit reduce the node circles size to 0
    nodeExit.select('circle')
    .remove();

    // On exit reduce the opacity of text labels
    nodeExit.select('text')
    .remove()

    const links = dag.links();
    var link = ast.selectAll(".link").data(links);

    var linkEnter = link.enter()
      .append("path")
      .attr("class", "link")
    var linkUpdate = linkEnter.merge(link)
    linkUpdate.transition()
      .duration(1500)
      .attr("fill", "none")
      .attr("stroke", "#ADADAD")
      .attr('marker-end', 'url(#arrow)')
      .attr("d", d3.linkHorizontal()
        .source(function(d) {
            return [d.source.x, d.source.y + 30];
        })
        .target(function(d) {
            return [d.target.x, d.target.y - 35];
        }));
      
    // Remove any exiting links
    link.exit()
      .transition()
      .duration(500)
      .remove();

    function dragStarting() {
      ast.attr("cursor", "grabbing");
    }
    
    function draggingNode(event) {
      // Update the node's position
      d3.select(this).attr("transform", function (d) {
       return "translate(" + event.x + "," + event.y + ")";
      })
      event.subject.x = event.x;
      event.subject.y = event.y;

      // Update all links
      link.enter().selectAll(".link")
        .attr("d", d3.linkHorizontal()
        .source(function(d) {
            return [d.source.x, d.source.y + 30];
        })
        .target(function(d) {
            return [d.target.x, d.target.y - 35];
        }));
    }

    function dragEnding() {
      ast.attr("cursor", "grab");  
    }
    
  } else {
    ast.style("opacity", 0);
  }
}

function get_curr_verdicts(spec, contract, update = true) {
  var verdicts = [];
  var previous = {truth: false, time_index: -1};
  var global_verdicts = [];
  if (contract) {
    global_verdicts = globalContracts;
  } else {
    global_verdicts = globalVerdicts;
  }

  for (var i = 0; i < global_verdicts.length; i++) {
    if (global_verdicts[i].timestamp_produced <= globalTimestamps[Math.min(curr_step - 1, globalTimestamps.length - 1)]) {
      if (contract){
        if (global_verdicts[i].spec_str != spec){
          continue;
        }
      } else {
        if (global_verdicts[i].spec_num != spec){
          continue;
        }
      }
      if (previous.time_index + 1 >= parseInt(document.getElementById("IntervalStart").value) && 
          global_verdicts[i].time_index >= parseInt(document.getElementById("IntervalStart").value) && 
            global_verdicts[i].time_index <= parseInt(document.getElementById("IntervalEnd").value)) {
        if (previous.time_index+1 != global_verdicts[i].time_index) {
          verdicts.push(new_verdict(global_verdicts[i], previous.time_index + 1)); // Provide points between aggregation
        }
        verdicts.push(new_verdict(global_verdicts[i], global_verdicts[i].time_index));
        previous = global_verdicts[i];
      } else {
        if (previous.time_index + 1 < parseInt(document.getElementById("IntervalStart").value)){
          if (verdicts.length == 0){
            verdicts.push(new_verdict(global_verdicts[i], Math.max(previous.time_index + 1, parseInt(document.getElementById("IntervalStart").value))));
          } else {
            verdicts[0] = new_verdict(global_verdicts[i], Math.max(previous.time_index + 1, parseInt(document.getElementById("IntervalStart").value)));
          }
          previous = global_verdicts[i];
        } 
        if (global_verdicts[i].time_index >= parseInt(document.getElementById("IntervalEnd").value)){
          if (previous.time_index+1 > parseInt(document.getElementById("IntervalEnd").value) &&
            previous.time_index != global_verdicts[i].time_index){
            break; 
          }
          if (previous.time_index+1 < global_verdicts[i].time_index) {
            verdicts.push(new_verdict(global_verdicts[i], previous.time_index + 1)); // Provide points between aggregation
          }
          verdicts.push(new_verdict(global_verdicts[i], Math.min(global_verdicts[i].time_index, parseInt(document.getElementById("IntervalEnd").value))));
          previous = verdicts[verdicts.length-1];
        }
      }
    }
  }
  if (verdicts.length > 0){
    verdicts.push(new_verdict(verdicts[verdicts.length-1], verdicts[verdicts.length-1].time_index + 0.5)); // Last point to make nice graph
  }

  function new_verdict(verdict, time_index){
    if (verdict.truth != null){
      return {truth: verdict.truth, time_index: time_index};
    } else {
      return {truth: verdict.status, time_index: time_index};
    }
  }

  if (update){
    if (contract) {
      currVerdicts.set(spec, verdicts);
    } else {
      currVerdicts.set(globalSpecMapReverse.get(spec), verdicts);
    }
  }
  return verdicts;
}

function change_graph() {
  var spec_name = document.getElementById("graphSpecSelection").textContent;
  if (spec_name.includes("Select Specification")){
    return;
  }
  svg.selectAll(".title").text(spec_name);
  var verdicts = [];
  if (globalSpecMap.has(spec_name)){
    var spec = (globalSpecMap.get(spec_name));
    svg.style("opacity", 1);
    verdicts = get_curr_verdicts(spec, false);
    if (verdicts.length == 0){
      svg.style("opacity", 0);
      return;
    }
    update_single_graph(verdicts);
  } else if (globalContractMap.has(spec_name)){
    svg.style("opacity", 1);
    verdicts = get_curr_verdicts(spec_name, true);
    if (verdicts.length == 0){
      svg.style("opacity", 0);
      remove_additional_graphs();
      return;
    }
    update_single_graph(verdicts, null, true);
    var inactive_verdicts = get_curr_verdicts(globalContractMap.get(spec_name)[0], false);
    update_single_graph(inactive_verdicts, globalSpecMapReverse.get(globalContractMap.get(spec_name)[0]));
    var invalid_verdicts = get_curr_verdicts(globalContractMap.get(spec_name)[1], false);
    update_single_graph(invalid_verdicts, globalSpecMapReverse.get(globalContractMap.get(spec_name)[1]));
    var verified_verdicts = get_curr_verdicts(globalContractMap.get(spec_name)[2], false);
    update_single_graph(verified_verdicts, globalSpecMapReverse.get(globalContractMap.get(spec_name)[2]));
  } else {
    svg.style("opacity", 0);
    return;
  }
}

// Create Graph Visualization with d3.js
const margin = {top: 40, right: 80, bottom: 40, left: 80};
const width = 1500 - margin.left - margin.right;
const height = 150;

var svg = d3.select("#graph-container")
  .append("svg")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("id", "main")
  .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

const x = d3.scaleLinear().range([0,width]); // x scale
const y = d3.scaleLinear().range([height, 0]); // y scale

config_graph(svg, "main");
svg.style("opacity", 0);

function add_graph(name){
  var new_svg = d3.select("#graph-container")
    .append("svg")
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr("id", name)
    .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

  config_graph(new_svg, name);

  globalAdditionalGraphsDisplayed.push(name);
}

d3.selection.prototype.moveToFront = function() {
  return this.each(function() {
    this.parentNode.appendChild(this);
  });
};

function config_graph(curr_svg, name){
  curr_svg.append("g") // x-axis
    .attr("transform", `translate(0,${height})`)
    .attr("class", "myXAxis");

  curr_svg.append("g") // y-axis
    .attr("class", "myYAxis");

  curr_svg.append('text')
    .attr('class', 'title')
    .attr('x', width / 2)
    .attr('y', -10)
    .style("font-size", "28px")
    .attr('text-anchor', 'middle')
    .text(name);

  curr_svg.append("g")
    .append('path')
    .data([])
    .attr("class","timeline");

  const mouse_g = curr_svg.append('g')
    .classed('mouse', true)
    .style('display', 'none');
  mouse_g.append('circle')
    .attr('r', 5)
    .attr("stroke", 'lightgray');

  d3.select("#" + name).on('mouseover', function (mouse) {
    mouse_g.style('display', 'block')
    mouse_g.moveToFront();
  })
  .on('mousemove', function (mouse) {
    const x_coord = Math.max(Math.round(x.invert(d3.pointer(mouse)[0] - margin.left)), 0);
    if (currVerdicts.has(d3.select(this).selectAll(".title").node().innerHTML)){
      var verdicts = currVerdicts.get(d3.select(this).selectAll(".title").node().innerHTML);
      x.domain([d3.min(verdicts, d => d.time_index),d3.max(verdicts, d => d.time_index)]);
      for (var i = 0; i < verdicts.length; i++){
        if (verdicts[i].time_index >= x_coord){
          if (typeof(verdicts[i].truth) == "boolean"){
            y.domain([0, 1]); // True or False
          } else {
            y.domain([0, 2]); // Inactive, Invalid, or Verified
          }
          mouse_g.attr('transform', `translate(${x(x_coord)},${y(verdicts[i].truth)})`);
          break;
        } else if (i == verdicts.length - 1){ // No valid verdicts
          mouse_g.style('display', 'none')
        }
      }
      var txt_arr = [];
      var txt = "";
      for (const [index, verdicts] of Array.from(currVerdicts.values()).entries()){
        for (var i = 0; i < verdicts.length; i++){
          if (verdicts[i].time_index >= x_coord){
            if (typeof(verdicts[i].truth) == "boolean"){
              txt = Array.from(currVerdicts.keys())[index] + ": " + verdicts[i].truth;
            }
            else {
              if (verdicts[i].truth == 2)
                txt = Array.from(currVerdicts.keys())[index] + ": verified";
              else if (verdicts[i].truth == 1)
                txt = Array.from(currVerdicts.keys())[index] + ": invalid";
              else 
                txt = Array.from(currVerdicts.keys())[index] + ": inactive";
            }
            txt_arr.push(txt);
            break;
          }
        }
      }

      // Create text box inspired from https://observablehq.com/@d3/line-with-tooltip/2
      const path = mouse_g.selectAll("path")
        .data([,])
        .join("path")
          .attr("fill", "white")
          .attr("stroke", "black");

      const text = mouse_g.selectAll("text")
        .data([,])
        .join("text")
        .call(text => text
          .selectAll("tspan")
          .data(txt_arr)
          .join("tspan")
            .attr("x", 0)
            .attr("y", (_, i) => `${i * 1.1}em`)
            .attr("font-weight", (_, i) => i ? null : "bold")
            .text(d => d));
      size(text, path);

      // Wraps the text with a callout path of the correct size, as measured in the page.
      function size(text, path) {
        const transform = mouse_g.attr("transform");
        var x_transform = 0;
        var y_transform = 0;
        const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
        if (match) {
            x_transform = parseFloat(match[1]);
            y_transform = parseFloat(match[2]);
        }
        const {x, y, width: w, height: h} = text.node().getBBox();
        if (y_transform > h){ // Box appears above circle
          if (x_transform - (w / 2) < 0){ // Too far to the left
            var shift_right = Math.max(-1 *(x_transform - (w / 2)), w / 2);
            text.attr("transform", `translate(${-w/2 + shift_right},${-h - 5})`); // Centers text in box
            path.attr("d", `M${-w / 2 + shift_right - 10},-5H${-w / 2 + shift_right - 5}l5,5l5,-5H${w / 2+ shift_right + 10}v${-h - 20}h-${w + 20}z`);
          } else if (x_transform + (w / 2) > width){ // Too far to the right
            var shift_left = -1 * Math.max(width - (x_transform + (w / 2)), w / 2);
            text.attr("transform", `translate(${-w / 2 + shift_left},${-h - 5})`); // Centers text in box
            path.attr("d", `M${-w / 2 + shift_left - 10},-5H${w / 2 + shift_left - 5}l5,5l5,-5H${w / 2 + shift_left + 10}v${-h - 20}h-${w + 20}z`);
          } else { // Center above circle
            text.attr("transform", `translate(${-w / 2},${-h - 5})`); // Centers text in box
            path.attr("d", `M${-w / 2 - 10},-5H-5l5,5l5,-5H${w / 2 + 10}v${-h - 20}h-${w + 20}z`);
          }
        } else { // Box appears below circle
          if (x_transform - (w / 2) < 0){ // Too far to the left
            var shift_right = Math.max(-1 *(x_transform - (w / 2)), w / 2);
            text.attr("transform", `translate(${-w / 2 + shift_right},${15 - y})`); // Centers text in box
            path.attr("d", `M${-w / 2 + shift_right- 10},5H${-w / 2 + shift_right - 5}l5,-5l5,5H${w / 2 + shift_right + 10}v${h + 20}h-${w + 20}z`);
          } else if (x_transform + (w / 2) > width){ // Too far to the right
            var shift_left = -1 * Math.max(width - (x_transform + (w / 2)), w / 2);
            text.attr("transform", `translate(${-w / 2 + shift_left},${15 - y})`); // Centers text in box
            path.attr("d", `M${-w / 2 + shift_left - 10},5H${-w / 2 - shift_left - 5}l5,-5l5,5H${w / 2 + shift_left + 10}v${h + 20}h-${w + 20}z`);
          } else { // Center below circle
            text.attr("transform", `translate(${-w / 2},${15 - y})`); // Centers text in box
            path.attr("d", `M${-w / 2 - 10},5H-5l5,-5l5,5H${w / 2 + 10}v${h + 20}h-${w + 20}z`);
          }
        }
      }
    }
  })
  .on('mouseout', function (mouse) {
      mouse_g.style('display', 'none');
  });
}

function remove_additional_graphs(){
  for(var i = 0; i < globalAdditionalGraphsDisplayed.length; i++){
    d3.select("#"+globalAdditionalGraphsDisplayed[i]).remove();
  }
  globalAdditionalGraphsDisplayed = [];
}


function update_single_graph(verdicts, name = null, contract = false){
  var curr_svg = svg;
  if (name != null) {
    if (!globalAdditionalGraphsDisplayed.includes(name))
      add_graph(name);
    curr_svg = d3.select("#" + name).select("g");
  }

  x.domain([d3.min(verdicts, d => d.time_index), d3.max(verdicts, d => d.time_index)]);

  var xAxis = d3.axisBottom(x);
  var xAxisTicks = x.ticks()
    .filter(tick => Number.isInteger(tick));
  xAxis.tickValues(xAxisTicks)
    .tickFormat(d3.format('d'))
  curr_svg.selectAll(".myXAxis")
    .transition()
    .duration(1500)
    .style("font-size","16px")
    .call(xAxis);

  if (!contract){
    y.domain([0, 1]);
    var yAxis = d3.axisLeft(y).tickValues([0,1])
      .tickFormat(function(d) { 
          if (d==1)
            return "True";
          else
            return "False";
      });
  } else {
    y.domain([0, 2]);
    var yAxis = d3.axisLeft(y).tickValues([0,1,2])
    .tickFormat(function(d) { 
        if (d == 0)
          return "Inactive";
        else if ( d == 1)
          return "Invalid";
        else
          return "Verified"
    });
  }
  curr_svg.selectAll(".myYAxis")
    .transition()
    .duration(1500)
    .style("font-size","16px")
    .call(yAxis);

  var line = d3.line() // Create line generator
    .curve(d3.curveStepAfter)
    .x(d => x(d.time_index))
    .y(d => y(d.truth));

  // Create a update selection: bind to the new data
  var u = curr_svg.selectAll(".timeline")
    .data([verdicts]);

  // Update the line
  u.enter()
  .append("path")
  .attr("class","timeline")
  .merge(u)
  .transition()
  .duration(1500)
  .attr("d", line)
    .attr("fill", "none")
    .attr("stroke", "#C8102E")
    .attr("stroke-width", 2.5);
}