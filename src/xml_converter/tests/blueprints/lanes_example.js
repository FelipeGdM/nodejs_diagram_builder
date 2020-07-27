module.exports = {
  "name": "Flow example",
  "description": "Simple workflow with a flow node",
  "blueprint_spec": {
    requirements: [],
    prepare: [],
    nodes: [
      {
        id: "1",
        type: "Start",
        name: "Start node",
        parameters: {
          input_schema: {},
        },
        next: "2",
        lane_id: "1"
      },
      {
        id: "2",
        type: "SystemTask",
        next: "3",
        name: "Node_1",
        lane_id: "1",
        category: "setToBag",
        parameters: {
          input: {
            value: "1"
          }
        }
      },
      {
        id: "3",
        type: "SystemTask",
        next: "99",
        name: "Node_2",
        lane_id: "2",
        category: "setToBag",
        parameters: {
          input: {
            value: "not 1"
          }
        }
      },
      {
        id: "99",
        type: "Finish",
        name: "Finish node",
        next: null,
        lane_id: "2"
      }
    ],
    lanes: [
      {
        id: "1",
        name: "initialLane",
        rule: [
          "fn",
          [
            "&",
            "args"
          ],
          true
        ]
      },
      {
        id: "2",
        name: "finalLane",
        rule: [
          "fn",
          [
            "&",
            "args"
          ],
          false
        ]
      },
    ],
    environment: {},
  }
}