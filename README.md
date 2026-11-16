# Prototipo CSSI (Self-Sovereign Identity Blockchain Framework)

Implementación del framework presentado en el artículo:
> *A Self-Sovereign Identity Blockchain Framework for Access Control and Transparency in Financial Institutions* (Ou, Chen y Lin, Cryptography 2025, 9, 9).

---

## 🚀 Ejecución Rápida Paso a Paso

### 1. Iniciar la Blockchain Local (Terminal 1)
En la carpeta del proyecto:
```bash
npx hardhat node
```
*Deja esta terminal abierta.* Verás 20 cuentas con sus claves privadas:
- **Cuenta #0:** Admin (despliega el contrato)
- **Cuenta #1:** Issuer (Banco emisor del VC)
- **Cuenta #2:** Verifier (Nodo validador)
- **Cuenta #3:** Customer / Holder (Cliente)
- **Cuenta #4:** Institución financiera (evalúa préstamos)

---

### 2. Desplegar y Sembrar Datos (Terminal 2)
En una segunda terminal:
```bash
# Desplegar contrato y registrar roles
npx hardhat run scripts/deploy.js --network localhost

# Emitir credenciales verificables (BancoX y BuroY) y registrarlas en la blockchain
npx hardhat run scripts/seed.js --network localhost
```

---

### 3. Levantar la Interfaz Web (Terminal 2 o 3)
```bash
npx serve frontend
```
Abre en tu navegador la URL indicada (usualmente `http://localhost:3000`).

---

### 4. Configurar MetaMask
1. Agrega una red manualmente:
   - **Nombre de red:** Hardhat Local
   - **RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `31337`
   - **Símbolo de moneda:** `ETH`
2. Importa las claves privadas de:
   - **Cuenta #3 (Cliente)**
   - **Cuenta #4 (Institución)**

---

### 5. Probar el Escenario Completo

#### Como Cliente (Cuenta #3):
1. Conecta MetaMask con la Cuenta #3.
2. (Opcional) Sube la dirección de tu activo digital.
3. En **Dar o revocar permiso**, ingresa la dirección de la Cuenta #4 (Institución), selecciona `asset_info`, define 2 horas y pulsa **Autorizar**.

#### Como Institución (Cuenta #4):
1. Cambia en MetaMask a la Cuenta #4.
2. Ingresa la dirección de la Cuenta #3 (Cliente), selecciona `asset_info` y pulsa **Consultar**.
3. Verás los datos de activos y saldo autorizados.

#### Casos de Prueba y Errores (Figuras 20 a 22):
- **No autorizado:** Consulta `credit_info` → Error: `Customer does not allow`.
- **Revocado:** Vuelve a la Cuenta #3, pulsa **Revocar**, y desde la Cuenta #4 vuelve a consultar `asset_info` → Error: `Customer does not allow`.
- **Expiración de tiempo:** Autoriza con 1 hora y ejecuta en la terminal:
  ```bash
  npx hardhat run scripts/advance-time.js --network localhost
  ```
  Al consultar nuevamente como institución verás: `The access period is expired`.

---

## 🧪 Pruebas Unitarias Automatizadas
Para verificar toda la lógica de los contratos en cualquier momento:
```bash
npx hardhat test
```
Los 5 tests deben pasar en verde.

