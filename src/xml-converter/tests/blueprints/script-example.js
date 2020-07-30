module.exports = {
  name: "Flow example",
  description: "Simple workflow with a flow node",
  blueprint_spec: {
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
        name: "Script tag",
        next: "99",
        lane_id: "1",
        parameters: {
          input: {},
          script: {
            package: "",
            function: [
              "fn",
              ["&", "args"],
              1
            ],
          },
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