export const abi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "FactoryDeploy",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_mainModule",
        type: "address",
      },
      {
        internalType: "bytes32",
        name: "_keysetHash",
        type: "bytes32",
      },
      {
        internalType: "address",
        name: "_dkimKeys",
        type: "address",
      },
    ],
    name: "deploy",
    outputs: [
      {
        internalType: "address",
        name: "_contract",
        type: "address",
      },
    ],
    stateMutability: "payable",
    type: "function",
  },
];
