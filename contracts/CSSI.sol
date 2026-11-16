// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CSSI {
    address public admin;
    mapping(address => bool) public isIssuer; // bancos, burós
    mapping(address => bool) public isVerifier; // nodos que validan el VP
    bytes32 public constant DIGITAL_KEY = keccak256("digital_assets");

    struct Credential {
        address issuer;
        string fname; // nombre de la institución (F_name del paper)
        bytes32 cn; // número de certificado (CN), no el número de cuenta real
        bytes32 vcHash; // hash del VC completo
        string uri; // datos de demo (JSON). Ver sección 13
        uint64 issuedAt;
    }

    // cliente => clave de credencial => credencial
    mapping(address => mapping(bytes32 => Credential)) private creds;
    // cliente => institución => clave => momento de expiración (0 = sin permiso)
    mapping(address => mapping(address => mapping(bytes32 => uint64))) public access;
    // cliente => direcciones de sus activos digitales (wallets, NFTs)
    mapping(address => address[]) private digitalAssets;

    event CredentialStored(address indexed customer, bytes32 indexed key);
    event AccessGranted(address indexed customer, address indexed inst, bytes32 key, uint64 until);
    event AccessRevoked(address indexed customer, address indexed inst, bytes32 key);
    event AccessLogged(address indexed customer, address indexed inst, bytes32 key);

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "not admin");
        _;
    }

    function setIssuer(address a, bool v) external onlyAdmin {
        isIssuer[a] = v;
    }

    function setVerifier(address a, bool v) external onlyAdmin {
        isVerifier[a] = v;
    }

    // Clave de una credencial = hash(nombre de institución + número de certificado)
    function credKey(string memory fname, bytes32 cn) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(fname, cn));
    }

    // PARTE 1, pasos 6-7: el verificador registra el VC ya validado
    function storeCredential(
        address customer,
        address issuer,
        string calldata fname,
        bytes32 cn,
        bytes32 vcHash,
        string calldata uri
    ) external {
        require(isVerifier[msg.sender], "not verifier");
        require(isIssuer[issuer], "unknown issuer");
        bytes32 k = credKey(fname, cn);
        creds[customer][k] = Credential(
            issuer,
            fname,
            cn,
            vcHash,
            uri,
            uint64(block.timestamp)
        );
        emit CredentialStored(customer, k);
    }

    // Activos digitales (flujo de la Figura 3 del paper)
    function addDigitalAsset(address assetAddr) external {
        digitalAssets[msg.sender].push(assetAddr);
    }

    // ALGORITMO 1: el cliente autoriza a una institución por N horas
    function grantAccess(address inst, bytes32 key, uint32 hoursValid) external {
        require(
            key == DIGITAL_KEY || creds[msg.sender][key].issuedAt != 0,
            "Customer info does not exist"
        );
        uint64 until = uint64(block.timestamp + uint256(hoursValid) * 1 hours);
        access[msg.sender][inst][key] = until;
        emit AccessGranted(msg.sender, inst, key, until);
    }

    // El cliente revoca (Period = 0 en el paper)
    function revokeAccess(address inst, bytes32 key) external {
        access[msg.sender][inst][key] = 0;
        emit AccessRevoked(msg.sender, inst, key);
    }

    // ALGORITMO 2: la institución lee. No es view para dejar un registro de auditoría.
    function accessCredential(address customer, bytes32 key) external returns (Credential memory) {
        require(creds[customer][key].issuedAt != 0, "Customer profile does not exist");
        uint64 until = access[customer][msg.sender][key];
        require(until != 0, "Customer does not allow");
        require(block.timestamp <= until, "The access period is expired");
        emit AccessLogged(customer, msg.sender, key);
        return creds[customer][key];
    }

    function accessDigitalAssets(address customer) external view returns (address[] memory) {
        uint64 until = access[customer][msg.sender][DIGITAL_KEY];
        require(until != 0, "Customer does not allow");
        require(block.timestamp <= until, "The access period is expired");
        return digitalAssets[customer];
    }
}

