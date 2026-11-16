const hre = require("hardhat");
const { issueVC, verifyVC } = require("./vc");
const { address } = require("../frontend/address.json");

async function main() {
  const { ethers } = hre;
  const [admin, issuer, verifier, customer] = await ethers.getSigners();
  const c = await ethers.getContractAt("CSSI", address);

  const items = [
    {
      fname: "BancoX",
      cn: "CN-ASSET-001",
      claims: { balance: 25000, realEstate: "Casa 120m2" },
    },
    {
      fname: "BuroY",
      cn: "CN-CREDIT-001",
      claims: { creditScore: 710, activeLoans: 1 },
    },
  ];

  for (const it of items) {
    // 1) el issuer emite y firma el VC
    const vc = await issueVC(issuer, customer.address, it.fname, it.cn, it.claims);
    // 2) el verificador comprueba la firma
    if (!verifyVC(vc, issuer.address)) throw new Error("VC inválido: " + it.fname);
    // 3) el verificador lo registra en la cadena
    const tx = await c.connect(verifier).storeCredential(
      customer.address,
      issuer.address,
      it.fname,
      ethers.id(it.cn), // CN
      ethers.id(JSON.stringify(vc)), // hash del VC completo
      JSON.stringify(it.claims) // datos de demo
    );
    await tx.wait();
    console.log("Registrada:", it.fname, it.cn);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

