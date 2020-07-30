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
        type: "ScriptTask",
        name: "Create values for bag",
        next: "3",
        lane_id: "1",
        parameters: {
          input: {},
          script: {
            package: "",
            function: [
              "fn",
              ["&", "args"],
              [
                "js",
                ["`",
                  "const val = {'value': 2}; val"
                ]
              ],
            ],
          },
        }
      },
      {
        id: "3",
        type: "Flow",
        name: "Chooses bag",
        next: {
          1: "4",
          default: "5",
        },
        lane_id: "1",
        parameters: {
          input: {
            decision: {
              $ref: "result.value"
            }
          }
        }
      },
      {
        id: "4",
        type: "SystemTask",
        next: "99",
        name: "Set to bag 1",
        lane_id: "1",
        category: "setToBag",
        parameters: {
          input: {
            value: "1"
          }
        }
      },
      {
        id: "5",
        type: "SystemTask",
        next: "99",
        name: "Set to bag 2",
        lane_id: "1",
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
        lane_id: "1"
      }
    ],
    lanes: [
      {
        id: "1",
        name: "default",
        rule: [
          "fn",
          [
            "&",
            "args"
          ],
          true
        ]
      }
    ],
    environment: {},
  }
}