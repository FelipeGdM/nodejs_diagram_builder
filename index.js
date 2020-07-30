/* eslint-disable new-cap */
const { xmlConverter } = require('./src/xml_converter/xml_converter');

async function buildXmlDiagram(blueprintSpec, workflowName) {
  const json2xml = new xmlConverter();
  json2xml.build_graph(blueprintSpec, workflowName);
  return json2xml.to_xml();
}

module.exports = buildXmlDiagram;
