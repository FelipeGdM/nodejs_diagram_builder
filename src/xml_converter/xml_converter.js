const BpmnModdle = require('bpmn-moddle');
const moddle = new BpmnModdle();

class xmlConverter{

    static validate(spec) {
        if(!spec.nodes || !spec.lanes){
            return false;
        }
        return true;
    }

    static std_lane_id(lane_id){
        return "Lane_"+lane_id;
    }

    static std_node_id(node_id){
        return ["Node", node_id].join("_");
    }

    static std_node_name(node_name){
        return node_name.split(" ").join("_");
    }

    static std_flow_id(node_id, node_next){
        return ["Flow", node_id, node_next].join("_")
    }

    parse_node(node, incoming_flows){
        const params = {
            id: xmlConverter.std_node_id(node.id),
            name: xmlConverter.std_node_name(node.name),
        };

        if(node.type === "Start"){
            params.outgoing = [this.parse_sequence_flow(node)];
            return moddle.create('bpmn:StartEvent', params);
        }else if(node.type === "Finish"){
            params.incoming = incoming_flows[xmlConverter.std_node_id(node.id)];
            return moddle.create('bpmn:EndEvent', params);
        }

        params.outgoing = [this.parse_sequence_flow(node)];
        params.incoming = incoming_flows[xmlConverter.std_node_id(node.id)];

        switch(node.type){
            case "SystemTask":
                return moddle.create('bpmn:ServiceTask', params);

            case "UserTask":
                return moddle.create('bpmn:UserTask', params);

            case "ScriptTask":
                return moddle.create('bpmn:ScriptTask', params);

            default:
                return moddle.create('bpmn:Task', params);
        };
    }

    parse_sequence_flow(node){

        if(node.type !== "Flow" && node.type !== "Finish"){
            // If node is not a flow node,
            // it has only one outgoing sequence
            const id = xmlConverter.std_flow_id(node.id, node.next);
            const sourceRef = {id: xmlConverter.std_node_id(node.id) };
            const targetRef = {id: xmlConverter.std_node_id(node.next) };

            return moddle.create('bpmn:SequenceFlow', {id, sourceRef, targetRef});
        }else{
            return;
        }
    }

    build_graph(blueprint_spec){
        if (!xmlConverter.validate(blueprint_spec)) {
			throw new Error('Invalid spec: no nodes or no lanes.');
        };

        this.xml_participant = moddle.create("bpmn:Participant", {
            id: "Global_Actor",
            processRef: {id: "Global_Process"}
        });

        this.xml_collab = moddle.create("bpmn:Collaboration", {
            id: "Global_Colab",
            participants: [
                this.xml_participant
            ]
        });

        this.incoming_flows = this.build_sequence_flows(blueprint_spec.nodes);

        this.xml_nodes = this.build_nodes(blueprint_spec.nodes, this.incoming_flows);

        this.xml_laneset = this.build_laneset(blueprint_spec.nodes, blueprint_spec.lanes);

        const flowElements = this.xml_nodes.concat(this.xml_sequences);
        this.xml_process = moddle.create("bpmn:Process",{
            // id: "Process_01zyiho",
            id: "Global_Process",
            laneSets: [this.xml_laneset],
            isExecutable: true,
            flowElements
        });

        this.xml_diagrams = this.build_diagram(this.xml_nodes, this.xml_sequences);

        const rootElements = [this.xml_process, this.xml_collab, this.xml_diagrams];
        this.root = moddle.create('bpmn:Definitions',
        {
            rootElements,
            // diagrams: this.xml_diagrams
        });
    }

    build_nodes(nodes, incoming_flows){
        return nodes.map(node =>
            this.parse_node(node, incoming_flows));
    }

    build_sequence_flows(nodes){

        let incoming_flows = {};
        this.xml_sequences = nodes.reduce( (retval, seq) => {
            const parsed = this.parse_sequence_flow(seq);
            if(typeof parsed !== "undefined"){
                retval.push(parsed);
            }
            return retval;
        }, []);
        nodes.forEach(node => incoming_flows[xmlConverter.std_node_id(node.id)] = []);
        this.xml_sequences.forEach(seq => {
            incoming_flows[seq.targetRef.id].push(seq)
        });

        return incoming_flows;
    }

    parse_lane(nodes, lane){
        const id = xmlConverter.std_lane_id(lane.id);
        let flowNodeRef = [];
        nodes.forEach(node => {
            if(node.lane_id === lane.id){
                flowNodeRef.push({id: xmlConverter.std_node_id(node.id)});
            }
        });
        return moddle.create('bpmn:Lane', {id, flowNodeRef});
    }

    build_laneset(nodes, lanes){
        let xml_lanes = lanes.map(lane => this.parse_lane(nodes, lane));
        return  moddle.create('bpmn:LaneSet', {id:'Global_LaneSet', lanes:xml_lanes});
    }

    build_diagram(xml_nodes, xml_sequences){

        const diagram_nodes = xml_nodes.map((node, index) => {

            const dim = 36;
            let bounds = moddle.create("dc:Bounds", {
                x: 50+120*index,
                y: 50,
                width: 100,
                height: 80
            });

            if(node.$type === "bpmn:StartEvent" || node.$type === "bpmn:EndEvent"){
                if(node.$type === "bpmn:StartEvent"){
                    bounds.x += bounds.width - dim;
                }
                bounds.y += (bounds.height - dim)/2;
                bounds.width = dim;
                bounds.height = dim;
            }

            return moddle.create("bpmndi:BPMNShape", {
                id: node.id + "_di",
                bpmnElement: {id: node.id},
                bounds
            });
        });

        const diagram_edges = xml_sequences.map((seq, index) => {
            let waypoint = [
                moddle.create("dc:Point", {x: 30+120*(index+1), y: 90,}),
                moddle.create("dc:Point", {x: 50+120*(index+1), y: 90,})];
            return moddle.create("bpmndi:BPMNEdge", {
                id: seq.id + "_di",
                bpmnElement: {id: seq.id},
                waypoint
            })
        });

        let planeElement = diagram_nodes.concat(diagram_edges);

        let bounds2 = moddle.create("dc:Bounds", {
            x: 10,
            y: 10,
            width: 600,
            height: 200
        });

        planeElement.push(moddle.create("bpmndi:BPMNShape", {
            id: "Global_Actor_di",
            bpmnElement: {id: "Global_Actor"},
            bounds: bounds2
        }));

        const plane = moddle.create("bpmndi:BPMNPlane", {
            id: "Global_Plane",
            bpmnElement: {id: "Global_Colab"},
            planeElement
        });

        return moddle.create("bpmndi:BPMNDiagram", {
            id: "Global_Diagram",
            plane
        });
    }

    build_nodes_id2index(nodes){
        let id2index = {};
        nodes.forEach( (value, index) => {
            id2index[value.id] = index;
        });
        return id2index;
    }

    discover_node_ranks(nodes, id2index){
        let pile = [];
        let id2rank = {};

        pile.push(nodes[0]);
        id2rank[nodes[0].id] = 0;

        while(pile.length != 0){
            const curr_node = pile.pop();
            let list_childs = [];

            switch(typeof curr_node.next){
                case "string":
                    list_childs.push(curr_node.next);
                    break;

                case "list":
                    list_childs.concat(curr_node.next);
                    break;

                case "undefined":
                    break;

                default:
                    console.log("xml_converter.discover_node_ranks() -> Unsupported type!");
                    break;
            }

            list_childs.forEach((child_id)=>{
                if(typeof id2rank[child_id] === "undefined"){
                    id2rank[child_id] = id2rank[curr_node.id] + 1;
                    pile.push(nodes[id2index[child_id]]);
                }
            });
        }

        return id2rank;
    }

    async to_xml(){
        const {xml} = await moddle.toXML(this.root);
        return xml;
    }

}

module.exports = {
    xmlConverter
}
