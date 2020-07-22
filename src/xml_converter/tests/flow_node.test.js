const { xmlConverter } = require('../xml_converter');
const BpmnModdle = require('bpmn-moddle');
const moddle = new BpmnModdle();

const flow_example = require('./blueprints/flow_example');
const simple_workflow = require('./blueprints/simple_workflow');

const flow_node = flow_example.blueprint_spec.nodes[2];

const converter = new xmlConverter();

describe('parsing tests', function () {
  function write(element) {

    // skip preamble for tests
    return moddle.toXML(element, { preamble: false });
  }

  describe('node parser', function () {

    const sequences = converter.build_sequence_flow(
      flow_example.blueprint_spec.nodes);

    it('should parse flow node', async function () {
      const expectedXML =
        '<bpmn:exclusiveGateway xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
        'id="Node_3" name="Chooses_bag">' +
        '<bpmn:incoming>Flow_2_3</bpmn:incoming>' +
        '<bpmn:outgoing>Flow_3_4</bpmn:outgoing>' +
        '<bpmn:outgoing>Flow_3_5</bpmn:outgoing>' +
        '</bpmn:exclusiveGateway>';

      const tag_obj = converter.parse_node(flow_node, sequences);
      const { xml } = await write(tag_obj);
      expect(xml).toEqual(expectedXML);

    })

  })

  describe('blueprint parser', function () {
    const das_converter = new xmlConverter();

    it('should parse all nodes into one xml', async function () {

      const expectedXML = '<bpmn:process xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Global_Process" ' +
        'isExecutable="true">' +
        '<bpmn:laneSet id="Global_LaneSet">' +
        '<bpmn:lane id="Lane_1">' +
        '<bpmn:flowNodeRef>Node_1</bpmn:flowNodeRef>' +
        '<bpmn:flowNodeRef>Node_2</bpmn:flowNodeRef>' +
        '<bpmn:flowNodeRef>Node_3</bpmn:flowNodeRef>' +
        '<bpmn:flowNodeRef>Node_4</bpmn:flowNodeRef>' +
        '<bpmn:flowNodeRef>Node_5</bpmn:flowNodeRef>' +
        '<bpmn:flowNodeRef>Node_99</bpmn:flowNodeRef>' +
        '</bpmn:lane>' +
        '</bpmn:laneSet>' +
        '<bpmn:startEvent id="Node_1" name="Start_node">' +
        '<bpmn:outgoing>Flow_1_2</bpmn:outgoing>' +
        '</bpmn:startEvent>' +
        '<bpmn:scriptTask id="Node_2" name="Create_values_for_bag">' +
        '<bpmn:incoming>Flow_1_2</bpmn:incoming>' +
        '<bpmn:outgoing>Flow_2_3</bpmn:outgoing>' +
        '</bpmn:scriptTask>' +
        '<bpmn:exclusiveGateway id="Node_3" name="Chooses_bag">' +
        '<bpmn:incoming>Flow_2_3</bpmn:incoming>' +
        '<bpmn:outgoing>Flow_3_4</bpmn:outgoing>' +
        '<bpmn:outgoing>Flow_3_5</bpmn:outgoing>' +
        '</bpmn:exclusiveGateway>' +
        '<bpmn:serviceTask id="Node_4" name="Set_to_bag_1">' +
        '<bpmn:incoming>Flow_3_4</bpmn:incoming>' +
        '<bpmn:outgoing>Flow_4_99</bpmn:outgoing>' +
        '</bpmn:serviceTask>' +
        '<bpmn:serviceTask id="Node_5" name="Set_to_bag_2">' +
        '<bpmn:incoming>Flow_3_5</bpmn:incoming>' +
        '<bpmn:outgoing>Flow_5_99</bpmn:outgoing>' +
        '</bpmn:serviceTask>' +
        '<bpmn:endEvent id="Node_99" name="Finish_node">' +
        '<bpmn:incoming>Flow_4_99</bpmn:incoming>' +
        '<bpmn:incoming>Flow_5_99</bpmn:incoming>' +
        '</bpmn:endEvent>' +
        '<bpmn:sequenceFlow id="Flow_1_2" sourceRef="Node_1" targetRef="Node_2" />' +
        '<bpmn:sequenceFlow id="Flow_2_3" sourceRef="Node_2" targetRef="Node_3" />' +
        '<bpmn:sequenceFlow id="Flow_3_4" sourceRef="Node_3" targetRef="Node_4" />' +
        '<bpmn:sequenceFlow id="Flow_3_5" sourceRef="Node_3" targetRef="Node_5" />' +
        '<bpmn:sequenceFlow id="Flow_4_99" sourceRef="Node_4" targetRef="Node_99" />' +
        '<bpmn:sequenceFlow id="Flow_5_99" sourceRef="Node_5" targetRef="Node_99" />' +
        '</bpmn:process>';

      das_converter.build_graph(flow_example.blueprint_spec);
      const { xml } = await write(das_converter.xml_process);
      expect(xml).toEqual(expectedXML);
    })
  })
})