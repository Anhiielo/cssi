const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CSSI", () => {
  let c, admin, issuer, verifier, customer, bank, key;

  beforeEach(async () => {
    [admin, issuer, verifier, customer, bank] = await ethers.getSigners();
    c = await (await ethers.getContractFactory("CSSI")).deploy();
    await c.setIssuer(issuer.address, true);
    await c.setVerifier(verifier.address, true);
    const cn = ethers.id("CERT-001");
    key = await c.credKey("BancoX", cn);
    await c.connect(verifier).storeCredential(
      customer.address,
      issuer.address,
      "BancoX",
      cn,
      ethers.id("vc"),
      "{}"
    );
  });

  it("permite acceso autorizado", async () => {
    await c.connect(customer).grantAccess(bank.address, key, 2);
    await c.connect(bank).accessCredential(customer.address, key);
  });

  it("rechaza si el cliente no autorizó", async () => {
    await expect(
      c.connect(bank).accessCredential(customer.address, key)
    ).to.be.revertedWith("Customer does not allow");
  });

  it("rechaza tras revocar", async () => {
    await c.connect(customer).grantAccess(bank.address, key, 2);
    await c.connect(customer).revokeAccess(bank.address, key);
    await expect(
      c.connect(bank).accessCredential(customer.address, key)
    ).to.be.revertedWith("Customer does not allow");
  });

  it("rechaza si el permiso expiró", async () => {
    await c.connect(customer).grantAccess(bank.address, key, 1);
    await time.increase(3601);
    await expect(
      c.connect(bank).accessCredential(customer.address, key)
    ).to.be.revertedWith("The access period is expired");
  });

  it("rechaza si la credencial no existe", async () => {
    await expect(
      c.connect(bank).accessCredential(customer.address, ethers.id("nada"))
    ).to.be.revertedWith("Customer profile does not exist");
  });
});

