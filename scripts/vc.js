const { ethers } = require("ethers");

// El issuer firma un VC (pasos 1-3 de la Parte 1)
async function issueVC(issuerSigner, customerAddr, fname, cn, claims) {
  const vc = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential", "FinancialCredential"],
    issuer: `did:ethr:${issuerSigner.address}`,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: `did:ethr:${customerAddr}`,
      institution: fname,
      certificateNumber: cn, // número de certificado, no la cuenta real
      claims,
    },
  };
  const payload = JSON.stringify(vc);
  const jws = await issuerSigner.signMessage(payload);
  return { ...vc, proof: { type: "EcdsaSecp256k1Signature2019", jws, payload } };
}

// El verificador comprueba que la firma sea del issuer esperado (pasos 4-5)
function verifyVC(vc, trustedIssuerAddr) {
  const signer = ethers.verifyMessage(vc.proof.payload, vc.proof.jws);
  return signer.toLowerCase() === trustedIssuerAddr.toLowerCase();
}

module.exports = { issueVC, verifyVC };

