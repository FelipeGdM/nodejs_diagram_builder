const { xmlConverter } = require('../xml_converter');
const fs = require('fs');
const path = require('path');
const BpmnModdle = require('bpmn-moddle');
const moddle = new BpmnModdle();

const simple_workflow = require('./blueprints/simple_workflow');
const script_example = require('./blueprints/script_example');
const lanes_example = require('./blueprints/lanes_example');

const start_node = simple_workflow.blueprint_spec.nodes[0];
const system_task_node = simple_workflow.blueprint_spec.nodes[1];
const finish_node = simple_workflow.blueprint_spec.nodes[2];

const script_node = script_example.blueprint_spec.nodes[1];

const converter = new xmlConverter();

describe('parsing tests', function () {

  function write(element) {

    // skip preamble for tests
    return moddle.toXML(element, { preamble: false });
  }

  describe('invalid input', function () {
    it("Empty spec", async function () {
      expect(() => converter.build_graph([])).toThrow();
    });
  });

  describe('sequence parser', function () {
    it("Start node", async function () {

      const expectedXML = '<bpmn:sequenceFlow xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
        'id="Flow_1_2" sourceRef="Node_1" targetRef="Node_2" />';

      const tag_obj = converter.parse_sequence_flow(start_node)[0];
      const { xml } = await write(tag_obj);

      expect(xml).toEqual(expectedXML);

    });
  });

  describe('node parser', function () {

    const sequences = converter.build_sequence_flows(simple_workflow.blueprint_spec.nodes);

    it("Id index bijection", async function(){

      const id2index = converter.build_nodes_id2index(simple_workflow.blueprint_spec.nodes);
      const expected = {"1": 0, "2": 1, "99": 2};

      expect(id2index).toStrictEqual(expected);
    });

    it("Simple node rank discover", async function(){

      const id2index = converter.build_nodes_id2index(simple_workflow.blueprint_spec.nodes);
      const {id2rank} = converter.discover_node_ranks(simple_workflow.blueprint_spec, id2index);
      const expected = {"Node_1": [0,0], "Node_2": [1,0], "Node_99": [2,0]};

      expect(id2rank).toStrictEqual(expected);
    });


    it("Start node", async function () {

      const expectedXML = '<bpmn:startEvent xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
        'id="Node_1" name="Start_node">' +
        '<bpmn:outgoing>Flow_1_2</bpmn:outgoing>' +
        '</bpmn:startEvent>';

      const tag_obj = converter.parse_node(start_node, sequences.incoming_flows);
      const { xml } = await write(tag_obj);
      expect(xml).toEqual(expectedXML);

    });

    it("Finish node", async function () {

      const expectedXML = '<bpmn:endEvent xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
        'id="Node_99" name="Finish_node">' +
        '<bpmn:incoming>Flow_2_99</bpmn:incoming>' +
        '</bpmn:endEvent>';

      const tag_obj = converter.parse_node(finish_node, sequences.incoming_flows);
      const { xml } = await write(tag_obj);
      expect(xml).toEqual(expectedXML);
    });

    it("System task node", async function () {

      const expectedXML = '<bpmn:serviceTask xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
        'id="Node_2" name="Set_to_bag_node">' +
        '<bpmn:incoming>Flow_1_2</bpmn:incoming>' +
        '<bpmn:outgoing>Flow_2_99</bpmn:outgoing>' +
        '</bpmn:serviceTask>';

      const tag_obj = converter.parse_node(system_task_node, sequences.incoming_flows);
      const { xml } = await write(tag_obj);
      expect(xml).toEqual(expectedXML);
    });

    it('should parse script task node', async function () {
      const sequences = converter.build_sequence_flows(script_example.blueprint_spec.nodes);

      const expectedXML = '<bpmn:scriptTask xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
        'id="Node_2" name="Script_tag">' +
        '<bpmn:incoming>Flow_1_2</bpmn:incoming>' +
        '<bpmn:outgoing>Flow_2_99</bpmn:outgoing>' +
        '</bpmn:scriptTask>';

      const tag_obj = converter.parse_node(script_node, sequences.incoming_flows);
      const { xml } = await write(tag_obj);
      expect(xml).toEqual(expectedXML);
    })

  });

  describe('lane parser', function () {

    it("Start node", async function () {
      const das_converter = new xmlConverter();

      const expectedXML = '<bpmn:laneSet xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
        'id="Global_LaneSet">' +
        '<bpmn:lane id="Lane_99" name="everyone">' +
        '<bpmn:flowNodeRef>Node_1</bpmn:flowNodeRef>' +
        '<bpmn:flowNodeRef>Node_2</bpmn:flowNodeRef>' +
        '<bpmn:flowNodeRef>Node_99</bpmn:flowNodeRef>' +
        '</bpmn:lane>' +
        '</bpmn:laneSet>';

      das_converter.build_graph(simple_workflow.blueprint_spec);

      const { xml } = await write(das_converter.xml_laneset);
      expect(xml).toEqual(expectedXML);

    });

    it("should parse 2 lanes with their names", async function () {
      const das_converter = new xmlConverter();

      const expectedXML = '<bpmn:laneSet xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
        'id="Global_LaneSet">' +
        '<bpmn:lane id=\"Lane_1\" name="initialLane">' +
        '<bpmn:flowNodeRef>Node_1</bpmn:flowNodeRef>' +
        '<bpmn:flowNodeRef>Node_2</bpmn:flowNodeRef>' +
        '</bpmn:lane>' +
        '<bpmn:lane id=\"Lane_2\" name="finalLane">' +
        '<bpmn:flowNodeRef>Node_3</bpmn:flowNodeRef>' +
        '<bpmn:flowNodeRef>Node_99</bpmn:flowNodeRef>' +
        '</bpmn:lane>' +
        '</bpmn:laneSet>';

      das_converter.build_graph(lanes_example.blueprint_spec);

      const { xml } = await write(das_converter.xml_laneset);
      expect(xml).toEqual(expectedXML);

    })
  });

  describe('collab parser', function () {

    const das_converter = new xmlConverter();

    it("Create participant tag", async function () {

      const expectedXML = '<bpmn:participant xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
        'id="Global_Actor" name="SIMPLE_WORKFLOW" processRef="Global_Process" />';

      das_converter.build_graph(simple_workflow.blueprint_spec, simple_workflow.name);
      const { xml } = await write(das_converter.xml_participant);
      expect(xml).toEqual(expectedXML);

    });

    it("Create collab tag", async function () {

      const expectedXML = '<bpmn:collaboration xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
        'id="Global_Colab">' +
        '<bpmn:participant id="Global_Actor" name="SIMPLE_WORKFLOW" processRef="Global_Process" />' +
        '</bpmn:collaboration>';

      das_converter.build_graph(simple_workflow.blueprint_spec, simple_workflow.name);
      const { xml } = await write(das_converter.xml_collab);
      expect(xml).toEqual(expectedXML);

    });

    it("Build process tag", async function () {

      const expectedXML = '<bpmn:process xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Global_Process" isExecutable="true">' + '<bpmn:laneSet id="Global_LaneSet">' +
        '<bpmn:lane id="Lane_99" name="everyone">' +
        '<bpmn:flowNodeRef>Node_1</bpmn:flowNodeRef>' +
        '<bpmn:flowNodeRef>Node_2</bpmn:flowNodeRef>' +
        '<bpmn:flowNodeRef>Node_99</bpmn:flowNodeRef>' +
        '</bpmn:lane>' +
        '</bpmn:laneSet>' +
        '<bpmn:startEvent id="Node_1" name="Start_node">' +
        '<bpmn:outgoing>Flow_1_2</bpmn:outgoing>' +
        '</bpmn:startEvent>' +
        '<bpmn:serviceTask id="Node_2" name="Set_to_bag_node">' +
        '<bpmn:incoming>Flow_1_2</bpmn:incoming>' +
        '<bpmn:outgoing>Flow_2_99</bpmn:outgoing>' +
        '</bpmn:serviceTask>' +
        '<bpmn:endEvent id="Node_99" name="Finish_node">' +
        '<bpmn:incoming>Flow_2_99</bpmn:incoming>' +
        '</bpmn:endEvent>' +
        '<bpmn:sequenceFlow id="Flow_1_2" sourceRef="Node_1" targetRef="Node_2" />' +
        '<bpmn:sequenceFlow id="Flow_2_99" sourceRef="Node_2" targetRef="Node_99" />' +
        '</bpmn:process>';

      das_converter.build_graph(simple_workflow.blueprint_spec);
      const { xml } = await write(das_converter.xml_process);
      expect(xml).toEqual(expectedXML);

    });
  });

  describe('xml generator', function(){
    it('simple workflow', async function(){

      const expected_xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI">' +
        '<bpmn:process id="Global_Process" isExecutable="true">' +
          '<bpmn:laneSet id="Global_LaneSet">' +
            '<bpmn:lane id="Lane_99">' +
              '<bpmn:flowNodeRef>Node_1</bpmn:flowNodeRef>' +
              '<bpmn:flowNodeRef>Node_2</bpmn:flowNodeRef>' +
              '<bpmn:flowNodeRef>Node_99</bpmn:flowNodeRef>' +
            '</bpmn:lane>' +
          '</bpmn:laneSet>' +
          '<bpmn:startEvent id="Node_1" name="Start_node">' +
            '<bpmn:outgoing>Flow_1_2</bpmn:outgoing>' +
          '</bpmn:startEvent>' +
          '<bpmn:serviceTask id="Node_2" name="Set_to_bag_node">' +
            '<bpmn:incoming>Flow_1_2</bpmn:incoming>' +
            '<bpmn:outgoing>Flow_2_99</bpmn:outgoing>' +
          '</bpmn:serviceTask>' +
          '<bpmn:endEvent id="Node_99" name="Finish_node">' +
            '<bpmn:incoming>Flow_2_99</bpmn:incoming>' +
          '</bpmn:endEvent>' +
          '<bpmn:sequenceFlow id="Flow_1_2" sourceRef="Node_1" targetRef="Node_2" />' +
          '<bpmn:sequenceFlow id="Flow_2_99" sourceRef="Node_2" targetRef="Node_99" />' +
        '</bpmn:process>' +
        '<bpmn:collaboration id="Global_Colab">' +
          '<bpmn:participant id="Global_Actor" processRef="Global_Process" />' +
        '</bpmn:collaboration>' +
        '<bpmndi:BPMNDiagram id="Global_Diagram">' +
          '<bpmndi:BPMNPlane id="Global_Plane" bpmnElement="Global_Colab">' +
            '<bpmndi:BPMNShape id="Node_1_di" bpmnElement="Node_1">' +
              '<dc:Bounds x="114" y="72" width="36" height="36" />' +
            '</bpmndi:BPMNShape>' +
            '<bpmndi:BPMNShape id="Node_2_di" bpmnElement="Node_2">' +
              '<dc:Bounds x="180" y="50" width="100" height="80" />' +
            '</bpmndi:BPMNShape>' +
            '<bpmndi:BPMNShape id="Node_99_di" bpmnElement="Node_99">' +
              '<dc:Bounds x="310" y="72" width="36" height="36" />' +
            '</bpmndi:BPMNShape>' +
            '<bpmndi:BPMNEdge id="Flow_1_2_di" bpmnElement="Flow_1_2">' +
              '<di:waypoint x="150" y="90" />' +
              '<di:waypoint x="160" y="90" /><di:waypoint x="160" y="90" /><di:waypoint x="180" y="90" />' +
            '</bpmndi:BPMNEdge>' +
            '<bpmndi:BPMNEdge id="Flow_2_99_di" bpmnElement="Flow_2_99">' +
              '<di:waypoint x="280" y="90" />' +
              '<di:waypoint x="290" y="90" />' +
              '<di:waypoint x="290" y="90" />' +
              '<di:waypoint x="310" y="90" />' +
            '</bpmndi:BPMNEdge>' +
            '<bpmndi:BPMNShape id="Lane_99_di" bpmnElement="Lane_99">' +
              '<dc:Bounds x="80" y="10" width="360" height="160" />' +
            '</bpmndi:BPMNShape>' +
            '<bpmndi:BPMNShape id="Global_Actor_di" bpmnElement="Global_Actor">' +
              '<dc:Bounds x="50" y="10" width="390" height="160" />' +
            '</bpmndi:BPMNShape>' +
          '</bpmndi:BPMNPlane>' +
        '</bpmndi:BPMNDiagram>' +
      '</bpmn:definitions>'

      converter.build_graph(simple_workflow.blueprint_spec);
      const retval = await converter.to_xml();
      expect(retval).toBe(expected_xml);
    });
  });
});
