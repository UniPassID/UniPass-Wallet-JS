export default {
  npmClient: "pnpm",
  https: {
    key: "./local.unipass-key.pem",
    cert: "./local.unipass.pem",
    hosts: ["local.unipass"],
    port: 443,
  },
};
