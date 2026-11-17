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

  it("storeCredential rechaza a no verificador y a emisor no registrado", async () => {
    const cn = ethers.id("CERT-002");
    await expect(
      c.connect(customer).storeCredential(
        customer.address,
        issuer.address,
        "BancoX",
        cn,
        ethers.id("vc2"),
        "{}"
      )
    ).to.be.revertedWith("not verifier");

    await expect(
      c.connect(verifier).storeCredential(
        customer.address,
        bank.address,
        "BancoX",
        cn,
        ethers.id("vc2"),
        "{}"
      )
    ).to.be.revertedWith("unknown issuer");
  });

  it("storeVCChunk permite registrar fragmentos y valida permisos y existencia", async () => {
    const chunk1 = ethers.toUtf8Bytes("chunk1");
    const chunk2 = ethers.toUtf8Bytes("chunk2");
    const chunk3 = ethers.toUtf8Bytes("chunk3");

    await expect(
      c.connect(customer).storeVCChunk(customer.address, key, chunk1)
    ).to.be.revertedWith("not verifier");

    await expect(
      c.connect(verifier).storeVCChunk(customer.address, ethers.id("no_existe"), chunk1)
    ).to.be.revertedWith("Customer profile does not exist");

    await expect(c.connect(verifier).storeVCChunk(customer.address, key, chunk1))
      .to.emit(c, "VCChunkStored")
      .withArgs(customer.address, key, 0);
    await c.connect(verifier).storeVCChunk(customer.address, key, chunk2);
    await c.connect(verifier).storeVCChunk(customer.address, key, chunk3);

    expect(await c.vcChunkCount(customer.address, key)).to.equal(3);
    expect(await c.getVCChunk(customer.address, key, 0)).to.equal(ethers.hexlify(chunk1));
    expect(await c.getVCChunk(customer.address, key, 1)).to.equal(ethers.hexlify(chunk2));
    expect(await c.getVCChunk(customer.address, key, 2)).to.equal(ethers.hexlify(chunk3));

    await expect(
      c.getVCChunk(customer.address, key, 3)
    ).to.be.revertedWith("invalid index");
  });

  it("reensambla fragmentos y coincide con vcHash", async () => {
    const cn = ethers.id("CERT-003");
    const k = await c.credKey("BancoX", cn);
    const fullVC = JSON.stringify({
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential"],
      claims: { balance: 50000 }
    });
    const expectedVcHash = ethers.id(fullVC);

    await c.connect(verifier).storeCredential(
      customer.address,
      issuer.address,
      "BancoX",
      cn,
      expectedVcHash,
      "{}"
    );

    const partLen = Math.ceil(fullVC.length / 3);
    const c1 = ethers.toUtf8Bytes(fullVC.slice(0, partLen));
    const c2 = ethers.toUtf8Bytes(fullVC.slice(partLen, partLen * 2));
    const c3 = ethers.toUtf8Bytes(fullVC.slice(partLen * 2));

    await c.connect(verifier).storeVCChunk(customer.address, k, c1);
    await c.connect(verifier).storeVCChunk(customer.address, k, c2);
    await c.connect(verifier).storeVCChunk(customer.address, k, c3);

    const r1 = await c.getVCChunk(customer.address, k, 0);
    const r2 = await c.getVCChunk(customer.address, k, 1);
    const r3 = await c.getVCChunk(customer.address, k, 2);

    const reassembledBytes = ethers.concat([r1, r2, r3]);
    const reassembledString = ethers.toUtf8String(reassembledBytes);
    expect(reassembledString).to.equal(fullVC);

    const computedHash = ethers.keccak256(reassembledBytes);
    expect(computedHash).to.equal(expectedVcHash);
  });

  it("accessDigitalAssets emite AccessLogged al ser consultado con permiso", async () => {
    const digitalKey = await c.DIGITAL_KEY();
    await c.connect(customer).addDigitalAsset(customer.address);
    await c.connect(customer).grantAccess(bank.address, digitalKey, 2);

    await expect(c.connect(bank).accessDigitalAssets(customer.address))
      .to.emit(c, "AccessLogged")
      .withArgs(customer.address, bank.address, digitalKey);
  });
});

