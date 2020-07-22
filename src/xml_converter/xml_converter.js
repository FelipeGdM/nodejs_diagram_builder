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
            params.outgoing = this.parse_sequence_flow(node);
            return moddle.create('bpmn:StartEvent', params);
        }else if(node.type === "Finish"){
            params.incoming = incoming_flows[xmlConverter.std_node_id(node.id)];
            return moddle.create('bpmn:EndEvent', params);
        } else if (node.type === 'Flow') {
            params.incoming = incoming_flows[xmlConverter.std_node_id(node.id)];
            params.outgoing = this.parse_sequence_flow(node);
            return moddle.create('bpmn:ExclusiveGateway', params)
        }

        params.outgoing = this.parse_sequence_flow(node);
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

            return [moddle.create('bpmn:SequenceFlow', { id, sourceRef, targetRef })];
        } else if (node.type === 'Flow') {
            const sourceRef = { id: xmlConverter.std_node_id(node.id) };
            const outgoing = [];
            for (let value in node.next) {
                const nextId = node.next[value];
                const id = xmlConverter.std_flow_id(node.id, nextId)
                if(outgoing.findIndex(el => el.id === id) === -1){
                    const targetRef = { id: xmlConverter.std_node_id(nextId) };
                    outgoing.push(moddle.create('bpmn:SequenceFlow', { id, sourceRef, targetRef }));
                }
            }
            return outgoing;
        } else {
            return [];
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

        const {incoming_flows, xml_sequences} = this.build_sequence_flows(blueprint_spec.nodes);

        this.xml_sequences = xml_sequences;
        this.xml_nodes = this.build_nodes(blueprint_spec.nodes, incoming_flows);

        this.xml_laneset = this.build_laneset(blueprint_spec.nodes, blueprint_spec.lanes);

        const flowElements = this.xml_nodes.concat(this.xml_sequences);
        this.xml_process = moddle.create("bpmn:Process",{
            // id: "Process_01zyiho",
            id: "Global_Process",
            laneSets: [this.xml_laneset],
            isExecutable: true,
            flowElements
        });

        const id2index = this.build_nodes_id2index(blueprint_spec.nodes);
        const {id2rank, y_depth} = this.discover_node_ranks(blueprint_spec, id2index);

        this.xml_diagrams = this.build_diagram(blueprint_spec, this.xml_sequences, id2rank, y_depth);

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

        let xml_sequences = [];
        nodes.forEach((node) => {
            const parsed = this.parse_sequence_flow(node);
            xml_sequences = [...xml_sequences, ...parsed];
        });

        let incoming_flows = {};

        xml_sequences.forEach(seq => {
            if(typeof incoming_flows[seq.targetRef.id] === "undefined"){
                incoming_flows[seq.targetRef.id] = [];
            }
            incoming_flows[seq.targetRef.id].push(seq);
        });

        return {incoming_flows, xml_sequences};
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

    build_diagram(spec, xml_sequences, id2rank, y_depth){

        const nodes = spec.nodes;
        const default_height = 80;
        const default_width = 100;
        const default_x_spacing = default_width + 20;
        const default_y_spacing = default_height + 20;
        const default_padding = 50;

        const start_stop_dim = 36;

        const lane_heigth = y_depth.map(el => el*default_y_spacing);

        let lane_heigth_con = [0];
        for(let i = 1; i < lane_heigth.length; i++){
            lane_heigth_con.push(lane_heigth_con[i-1]+lane_heigth[i-1]);
        }

        const lanes_ids = spec.lanes.map(lane => lane.id).sort((a,b) => a - b);

        const default_style = (node) => {
            return moddle.create("dc:Bounds", {
                x: default_padding + default_x_spacing*id2rank[xmlConverter.std_node_id(node.id)][0],
                y: default_padding + default_y_spacing*id2rank[xmlConverter.std_node_id(node.id)][1] + lane_heigth_con[lanes_ids.findIndex(el => el===node.lane_id)],
                width: default_width,
                height: default_height
            });
        }

        const bounds_style = {
            "Start": (node) => {
                return moddle.create("dc:Bounds", {
                    x: default_padding + default_x_spacing*id2rank[xmlConverter.std_node_id(node.id)][0] + default_width - start_stop_dim,
                    y: default_padding + default_y_spacing*id2rank[xmlConverter.std_node_id(node.id)][1] + (default_height - start_stop_dim)/2,
                    width: start_stop_dim,
                    height: start_stop_dim
                });
            },
            "Finish": (node) => {
                return moddle.create("dc:Bounds", {
                    x: default_padding + default_x_spacing*id2rank[xmlConverter.std_node_id(node.id)][0],
                    y: default_padding + default_y_spacing*id2rank[xmlConverter.std_node_id(node.id)][1] + (default_height - start_stop_dim)/2,
                    width: start_stop_dim,
                    height: start_stop_dim
                });
            },
            "SystemTask": default_style,
            "UserTask": default_style,
            "ScriptTask": default_style,
            "Flow": default_style,
        }

        const bounds_array = {};
        nodes.forEach((node) =>
            bounds_array[xmlConverter.std_node_id(node.id)] = bounds_style[node.type](node));

        const diagram_nodes = nodes.map((node) => {

            let bounds = bounds_array[xmlConverter.std_node_id(node.id)];

            return moddle.create("bpmndi:BPMNShape", {
                id: xmlConverter.std_node_id(node.id) + "_di",
                bpmnElement: {id: xmlConverter.std_node_id(node.id)},
                bounds
            });
        });

        const diagram_edges = xml_sequences.map((seq) => {
            let waypoint = [
                moddle.create("dc:Point",
                {
                    x: bounds_array[seq.sourceRef.id].x + bounds_array[seq.sourceRef.id].width,
                    y: bounds_array[seq.sourceRef.id].y + bounds_array[seq.sourceRef.id].height/2
                }),
                moddle.create("dc:Point", {
                    x: bounds_array[seq.targetRef.id].x,
                    y: bounds_array[seq.targetRef.id].y + bounds_array[seq.targetRef.id].height/2
                })];
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

    discover_node_ranks(spec, id2index){

        const nodes = spec.nodes;
        const lanes = spec.lanes;
        const lanes_ids = lanes.map(lane => lane.id).sort((a, b) => a - b);

        let pile = [];
        let id2rank = {};

        pile.push(nodes[0]);
        id2rank[xmlConverter.std_node_id(nodes[0].id)] = [0,-1];

        // x ranks
        while(pile.length != 0){
            const curr_node = pile.pop();
            let list_childs = [];

            switch(typeof curr_node.next){
                case "string":
                    list_childs.push(curr_node.next);
                    break;

                case "object":
                    if(curr_node.next){
                        Object.keys(curr_node.next).forEach((key) => {
                            const next_node = curr_node.next[key];
                            if(!list_childs.includes(next_node)){
                                list_childs.push(next_node);
                            }
                        });
                    }

                case "undefined":
                    break;

                default:
                    console.log("xml_converter.discover_node_ranks() -> Unsupported type!", typeof curr_node.next);
                    break;
            }

            list_childs.forEach((child_id)=>{
                if(typeof id2rank[xmlConverter.std_node_id(child_id)] === "undefined"){

                    id2rank[xmlConverter.std_node_id(child_id)] = [0,-1];
                    id2rank[xmlConverter.std_node_id(child_id)][0] =
                        id2rank[xmlConverter.std_node_id(curr_node.id)][0] + 1;

                    pile.push(nodes[id2index[child_id]]);
                }
            });
        }

        // y ranks
        let flow_pile = [];
        let y_depth = lanes_ids.map(() => 0);
        flow_pile.push(nodes[0]);

        while(flow_pile.length!==0){
            let curr_node = flow_pile.pop();

            while(id2rank[xmlConverter.std_node_id(curr_node.id)][1] !== -1){
                curr_node = flow_pile.pop();
            }

            const curr_lane = curr_node.lane_id;

            while(curr_node){
                if(id2rank[xmlConverter.std_node_id(curr_node.id)][1] !== -1){
                    break;
                }

                id2rank[xmlConverter.std_node_id(curr_node.id)][1] =
                    y_depth[lanes_ids.findIndex(el => el===curr_node.lane_id)];

                switch(typeof curr_node.next){
                    case "string":
                        curr_node = nodes[id2index[curr_node.next]];
                        break;

                    case "object":
                        if(curr_node.next){
                            Object.keys(curr_node.next).forEach((key) => {
                                const next_node = nodes[id2index[curr_node.next[key]]];
                                if(!flow_pile.includes(next_node)){
                                    flow_pile.push(next_node);
                                }
                            });
                            curr_node = flow_pile.pop();
                        }
                        break;

                    case "undefined":
                        curr_node = null;
                        break;

                    default:
                        break;
                }
            }
            y_depth[lanes_ids.findIndex(el => el===curr_lane)] += 1;
        }

        return {id2rank, y_depth};
    }

    async to_xml(){
        const {xml} = await moddle.toXML(this.root);
        return xml;
    }

}

module.exports = {
    xmlConverter
}
