const { xmlConverter } = require('../xml_converter');
const fs = require('fs');
const path = require('path');
const BpmnModdle = require('bpmn-moddle');
const moddle = new BpmnModdle();

const simple_workflow = require('./blueprints/simple_workflow');
const script_example = require('./blueprints/script_example');

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

      const tag_obj = converter.parse_sequence_flow(start_node);
      const { xml } = await write(tag_obj);

      expect(xml).toEqual(expectedXML);

    });
  });

  describe('node parser', function () {

    let sequences = converter.build_sequence_flow(simple_workflow.blueprint_spec.nodes);

    it("Start node", async function () {

      const expectedXML = '<bpmn:startEvent xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
        'id="Node_1" name="Start_node">' +
        '<bpmn:outgoing>Flow_1_2</bpmn:outgoing>' +
        '</bpmn:startEvent>';

      const tag_obj = converter.parse_node(start_node, sequences);
      const { xml } = await write(tag_obj);
      expect(xml).toEqual(expectedXML);

    });

    it("Finish node", async function () {

      const expectedXML = '<bpmn:endEvent xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
        'id="Node_99" name="Finish_node">' +
        '<bpmn:incoming>Flow_2_99</bpmn:incoming>' +
        '</bpmn:endEvent>';

      const tag_obj = converter.parse_node(finish_node, sequences);
      const { xml } = await write(tag_obj);
      expect(xml).toEqual(expectedXML);
    });

    it("System task node", async function () {

      const expectedXML = '<bpmn:serviceTask xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
        'id="Node_2" name="Set_to_bag_node">' +
        '<bpmn:incoming>Flow_1_2</bpmn:incoming>' +
        '<bpmn:outgoing>Flow_2_99</bpmn:outgoing>' +
        '</bpmn:serviceTask>';

      const tag_obj = converter.parse_node(system_task_node, sequences);
      const { xml } = await write(tag_obj);
      expect(xml).toEqual(expectedXML);
    });

    it('should parse script task node', async function () {
      sequences = converter.build_sequence_flow(script_example.blueprint_spec.nodes);

      const expectedXML = '<bpmn:scriptTask xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
        'id="Node_2" name="Script_tag">' +
        '<bpmn:incoming>Flow_1_2</bpmn:incoming>' +
        '<bpmn:outgoing>Flow_2_99</bpmn:outgoing>' +
        '</bpmn:scriptTask>';

      const tag_obj = converter.parse_node(script_node, sequences);
      const { xml } = await write(tag_obj);
      expect(xml).toEqual(expectedXML);
    })

  });

  describe('lane parser', function () {

    const das_converter = new xmlConverter();

    it("Start node", async function () {

      const expectedXML = '<bpmn:laneSet xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
        'id="Global_LaneSet">' +
        '<bpmn:lane id=\"Lane_99\">' +
        '<bpmn:flowNodeRef>Node_1</bpmn:flowNodeRef>' +
        '<bpmn:flowNodeRef>Node_2</bpmn:flowNodeRef>' +
        '<bpmn:flowNodeRef>Node_99</bpmn:flowNodeRef>' +
        '</bpmn:lane>' +
        '</bpmn:laneSet>';

      das_converter.build_graph(simple_workflow.blueprint_spec);

      const { xml } = await write(das_converter.xml_laneset);
      expect(xml).toEqual(expectedXML);

    });
  });

  describe('collab parser', function () {

    const das_converter = new xmlConverter();

    it("Create participant tag", async function () {

      const expectedXML = '<bpmn:participant xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
        'id="Global_Actor" processRef="Global_Process" />';

      das_converter.build_graph(simple_workflow.blueprint_spec);
      const { xml } = await write(das_converter.xml_participant);
      expect(xml).toEqual(expectedXML);

    });

    it("Create collab tag", async function () {

      const expectedXML = '<bpmn:collaboration xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
        'id="Global_Colab">' +
        '<bpmn:participant id="Global_Actor" processRef="Global_Process" />' +
        '</bpmn:collaboration>';

      das_converter.build_graph(simple_workflow.blueprint_spec);
      const { xml } = await write(das_converter.xml_collab);
      expect(xml).toEqual(expectedXML);

    });

    it("Build process tag", async function () {

      const expectedXML = '<bpmn:process xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Global_Process" isExecutable="true">' + '<bpmn:laneSet id="Global_LaneSet">' +
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
        '</bpmn:process>';

      das_converter.build_graph(simple_workflow.blueprint_spec);
      const { xml } = await write(das_converter.xml_process);
      expect(xml).toEqual(expectedXML);

    });
  });
});
