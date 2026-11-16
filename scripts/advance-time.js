const hre = require("hardhat");

async function main() {
  await hre.network.provider.send("evm_increaseTime", [7200]); // 2 horas
  await hre.network.provider.send("evm_mine");
  console.log("Reloj avanzado 2 horas");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

