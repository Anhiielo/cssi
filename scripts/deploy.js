const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [admin, issuer, verifier] = await hre.ethers.getSigners();
  const c = await (await hre.ethers.getContractFactory("CSSI")).deploy();
  await c.waitForDeployment();
  await (await c.setIssuer(issuer.address, true)).wait();
  await (await c.setVerifier(verifier.address, true)).wait();
  const address = await c.getAddress();
  if (!fs.existsSync("frontend")) {
    fs.mkdirSync("frontend", { recursive: true });
  }
  fs.writeFileSync("frontend/address.json", JSON.stringify({ address }));
  console.log("CSSI desplegado en:", address);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

