const fs = require('fs');
const path = require('path');
const { xmlConverter } = require('./src/xml_converter/xml_converter');

// const json_sample = "ATV_ACTIVATED_CONTRACT.json";
const json_sample = "lanes_example.json";
const dir = path.join(__dirname, "assets/");

const workflow = JSON.parse(fs.readFileSync(path.join(dir, json_sample)));

json2xml = new xmlConverter();

json2xml.build_graph(workflow.blueprint_spec, workflow.name);

json2xml.to_xml()
    .then(console.log)
    .catch(console.log);
