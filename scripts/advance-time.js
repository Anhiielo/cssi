const hre = require("hardhat");

async function main() {
  await hre.network.provider.send("evm_increaseTime", [3601]); // 3601 segundos (1 hora y 1 segundo)
  await hre.network.provider.send("evm_mine");
  console.log("Reloj avanzado 3601 segundos");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

