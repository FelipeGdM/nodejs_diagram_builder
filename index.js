/* eslint-disable new-cap */
const { XmlConverter } = require('./src/xml-converter/xml-converter');

async function buildXmlDiagram(blueprintSpec, workflowName) {
  const json2xml = new XmlConverter();
  json2xml.build_graph(blueprintSpec, workflowName);
  return json2xml.to_xml();
}

module.exports = buildXmlDiagram;
