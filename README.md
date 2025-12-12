# SportRent – Sporto Inventoriaus Nuomos Sutartis

**Laboratorinis darbas Nr. 4** 

---

## 1. Trumpas aprašymas

Šiame projekte sukūriau išmaniąją sutartį sporto inventoriaus nuomos depozito apdorojimui (be nuomos kainos). 

Naudojau **escrow** logiką - užtikrinamas saugus atsiskaitymas per smart contract, kad nei savininkas, nei nuomininkas nerizikuotų prarasti pinigų ar inventoriaus.

_(Escrow = tarpininkas, kuris laiko pinigus, kol abi pusės įvykdo savo įsipareigojimus)_

**Realaus pasaulio panaudojimo atvejai:**
- ⛷️ Slidinėjimo įrangos nuoma
- 🏄 Banglentių nuoma
- 🚴 Dviračių nuoma
- 🎾 Teniso raketės nuoma
**...**

Sutartį testavau **Remix** aplinkoje ir paruošiau deploy'inimui į **Sepolia testnet**. Pridėjau **DApp** su MetaMask integracija.

---

## 2. Verslo modelis

### Pagrindiniai veikėjai

| Rolė | Atsakomybės |
|------|-------------|
| **Owner** | Inventoriaus savininkas. Sukuria nuomos pasiūlymą, išduoda inventorių, gauna kompensaciją jei sugadinta. |
| **Renter** | Nuomininkas. Sumoka depozitą, naudoja inventorių, gauna pinigus atgal jei grąžina tvarkingai. |
| **Inspector** | Nepriklausomas tikrintojas. Apžiūri grąžintą inventorių ir nusprendžia: tvarkingas ar sugadintas. |

### Tipiniai scenarijai

**Scenarijus A: Sėkmingas procesas**
1. Owner sukuria pasiūlymą (depozitas + inspector adresas)
2. Renter sumoka depozitą → pinigai užšąla contract'e
3. Owner išduoda inventorių (pvz., teniso raketę)
4. Renter naudoja x dienų ir grąžina
5. Inspector apžiūri → **inventorius tvarkingas**
6. Owner užbaigia → **Renter gauna depozitą atgal** ✅

**Scenarijus B: Sugadintas inventorius**
1. Owner sukuria pasiūlymą (depozitas + inspector adresas)
2. Renter sumoka depozitą → pinigai užšąla contract'e
3. Owner išduoda inventorių (pvz., teniso raketę)
4. Renter naudoja x dienų ir grąžina
5. Inspector apžiūri → **randa pažeidimą**
6. Owner užbaigia → **Owner gauna depozitą kaip kompensaciją** ❌

---

## 3. Sekų diagrama

![Sequence Diagram](img/seku_diagrama.png)

Parašiau PlantUML kodą ir generavau su: https://plantuml.com/

### Sekų aprašymai:

**Seka 1: Deploy**
- Owner iškviečia `constructor()` su depozito suma ir inspector adresu
- Contract išsaugo parametrus ir nustato `state = Created`

**Seka 2: Nuoma**
- Renter iškviečia `rent()` ir sumoka depozitą
- Contract patikrina sumą, išsaugo Renter adresą, nustato `state = Rented`
- ETH užrakinama contract balance

**Seka 3: Išdavimas**
- Owner fiziškai išduoda inventorių Renter'iui
- Owner iškviečia `markIssued()` → `state = Issued`

**Seka 4: Grąžinimas**
- Renter fiziškai grąžina inventorių
- Inspector apžiūri būklę ir iškviečia `confirmReturn(damaged)`
- Jei `damaged = false` → `state = ReturnedOk`
- Jei `damaged = true` → `state = ReturnedDamaged`

**Seka 5: Užbaigimas**
- Jei ReturnedOk: Owner iškviečia `complete()` → contract perveda depozitą Renter'iui
- Jei ReturnedDamaged: Owner iškviečia `completeDamaged()` → contract perveda depozitą Owner'iui
- `state = Completed`

---

## 4. Smart Contract (SportRent.sol)

**Failas:** `contracts/SportRent.sol`

**Pagrindinės funkcijos:**
- `constructor(deposit, inspector)` – sukuria pasiūlymą
- `rent()` – Renter sumoka depozitą
- `markIssued()` – Owner patvirtina išdavimą
- `confirmReturn(damaged)` – Inspector tikrina būklę
- `complete()` – grąžina depozitą Renter (jei OK)
- `completeDamaged()` – perveda depozitą Owner (jei sugadinta)

**Būsenos:**
```
Created → Rented → Issued → ReturnedOk/ReturnedDamaged → Completed
```

---

## 5. Lokalus testavimas (Remix)

Testavau kontraktą **Remix IDE** su **JavaScript VM (Remix VM/Prague)**:

### 5.1 Deploy

Sutarties diegimas su Owner, Inspector ir Renter vaidmenimis.

**Konfiguracijos:**

<img width="300" alt="Remix compile" src="https://github.com/user-attachments/assets/10fb4565-ad19-4f0f-95ed-a3df05cfdcc1" />

**Inspector pasirinktas kaip 2 account'as:**

<img width="300" alt="Deploy success" src="https://github.com/user-attachments/assets/0585c272-9bb8-422f-b3f0-1031e8a6e1b6" />

**Contract sėkmingas:**

<img width="750" alt="Contract address" src="https://github.com/user-attachments/assets/e95b7ec0-afa6-4230-b8a7-899c7c5b58ac" />

### 5.2 rent() – Depozito mokėjimas

**Mokėjimas sėkmingas:**

<img width="300" alt="rent call" src="https://github.com/user-attachments/assets/b68b25c9-2ef3-4510-ba7e-9688ccc493e1" />

**Nuomininkas sumokėjo 1 ETH depozitą:**

<img width="300" alt="balance 1 ETH" src="https://github.com/user-attachments/assets/b023920a-8202-425e-b41b-ad6175fa733f" />

### 5.3 markIssued() – Išdavimo patvirtinimas

Savininkas patvirtina, kad inventorius išduotas.
**Patvirtinimas sėkmingas: **

<img width="900" alt="markIssued call" src="https://github.com/user-attachments/assets/30f3112e-f220-4658-a865-a8815a5a2c47" />

### 5.4 confirmReturn() – Inspektoriaus tikrinimas

#### Scenarijus 1: Inventorius tvarkingas ✅

Inspektorius patvirtina, kad inventorius grąžintas be pažeidimų (damaged = false).

**confirmReturn(false) iškvieta:**

<img width="300" alt="confirmReturn false" src="https://github.com/user-attachments/assets/2035cc53-c541-4f80-bdc1-ed368bde088e" />

**Transakcija sėkminga:**

<img width="900" alt="transaction success" src="https://github.com/user-attachments/assets/1efa9531-b72d-4cba-b322-6bcfd89a545b" />

### 5.5 complete() – Depozito grąžinimas nuomininkui

#### Scenarijus 1: Depozito grąžinimas ✅

Kai inventorius tvarkingas, nuomininkas gauna pinigus atgal.

**complete() iškvieta:**

<img width="900" alt="complete call" src="https://github.com/user-attachments/assets/dfa65ca0-4c52-4fa9-8c97-214cf015a04f" />

**Rezultatas:** Renter atgavo 1 ETH depozitą

<img width="300" alt="balance 0 ETH" src="https://github.com/user-attachments/assets/283caa95-69b5-44b9-a1b7-e25cb1df6f40" />


### 5.6 completeDamaged() – Pinigų grąžinimas savininkui

#### Scenarijus 2: Inventorius sugadintas ❌

Kai inventorius sugadintas, savininkas gauna pinigus kaip kompensaciją.

**confirmReturn(true) iškvieta:**

<img width="300" alt="confirmReturn true" src="https://github.com/user-attachments/assets/eab08a44-972f-49f4-8dac-51c9d8c2117c" />

**completeDamaged() iškviesta sėkmingai:**

<img width="900" alt="completeDamaged call" src="https://github.com/user-attachments/assets/a209bb28-a4a6-4c50-be24-30c2d9f51aff" />

**Rezultatas:** Owner gavo 1 ETH kompensaciją, Renter neatgavo

<img width="300" alt="Owner receives deposit" src="https://github.com/user-attachments/assets/f83e8e13-0e5f-464e-9112-a302fd7b2790" />

Gas taip pat yra nuskaičiuojamas, tai matosi iš Inspector sąskaitos.

---

## 6. Sepolia testnet deployment

Po lokalaus testavimo deploy'inau į **Sepolia testnet**:

**Procesas:**
1. Susikūriau MetaMask accounta ir perjungiau į Sepolia

<img width="300" alt="image" src="https://github.com/user-attachments/assets/b6a911ff-6325-4402-aa4f-3704b03c20d4" />

2. Sukūriau 3 accountus:

<img width="300"alt="image" src="https://github.com/user-attachments/assets/ff7e36fe-3004-4454-9455-5c4ccd2e50ac" />

3. Test ETH mininau iš: https://sepolia-faucet.pk910.de/

<img width="300" alt="Screenshot 2025-12-09 202837" src="https://github.com/user-attachments/assets/9509b216-f812-41c8-97a7-635189a01b42" />

Renter'iui primininau ~0.1 SepETH depozitui ir gazui. Inspektoriui ir owner'iui mažiau, kad tiesiog būtų ant gazo.

4. Remix → Injected Provider
   
<img width="300" alt="image" src="https://github.com/user-attachments/assets/860c244e-fce5-45d3-bdf9-21e07f6d399a" />

5. Testavimas

Rolė | Pradinės sumos | 
|------|-----------------|
| Renter | 0.1147 ETH |
| Owner | 0.0935 ETH |
| Inspector | 0.0578 ETH |

<img width="300" height="779" alt="image" src="https://github.com/user-attachments/assets/25e424d1-36f1-4d07-832f-093a677d1e92" />

### 5.1 Deploy

**Konfiguracijos:**

Deposit: 0.05 ETH

**MetaMask patvirtinimas:**

<img width="300" alt="image" src="https://github.com/user-attachments/assets/b08d01ee-04dc-4a96-8a45-1e2864da953b" />

**Contract sėkmingas:**

<img width="2134" height="488" alt="image" src="https://github.com/user-attachments/assets/b8911b50-0f85-4a96-ba9f-c49fb41ba612" />

### 5.2 rent() – Depozito mokėjimas

**MetaMask patvirtinimas:**

<img width="300" alt="image" src="https://github.com/user-attachments/assets/ebe88897-0adc-420c-89d6-556ae8b917bc" />

**Mokėjimas sėkmingas:**

<img width="2120" height="98" alt="image" src="https://github.com/user-attachments/assets/0a90e05c-d006-4060-8995-33a4423c356b" />

**Nuomininkas sumokėjo 0.05 ETH depozitą:**

<img width="300" alt="image" src="https://github.com/user-attachments/assets/b3d606c7-bdb8-4dbd-bf30-614e743f539e" />



<img width="600" alt="image" src="https://github.com/user-attachments/assets/700baab5-0f9f-4464-8ee0-b46efb079d42" />


### 5.3 markIssued() – Išdavimo patvirtinimas

Savininkas patvirtina, kad inventorius išduotas.
**MetaMask patvirtinimas:**

<img width="300" alt="image" src="https://github.com/user-attachments/assets/73c8ea8e-cfeb-4f01-9909-4c45a297725d" />

**Patvirtinimas sėkmingas:**

<img width="2141" height="112" alt="image" src="https://github.com/user-attachments/assets/829376c2-c7f0-4c2b-a3b2-b12e8ecc0793" />


### 5.4 confirmReturn() – Inspektoriaus tikrinimas

#### Scenarijus 1: Inventorius tvarkingas ✅

Inspektorius patvirtina, kad inventorius grąžintas be pažeidimų (damaged = false).

**confirmReturn(false) iškvieta:**

<img width="300" alt="image" src="https://github.com/user-attachments/assets/29f86702-7b59-43b6-9e24-05ddbeea0897" />


**MetaMask patvirtinimas:**

<img width="300" alt="image" src="https://github.com/user-attachments/assets/c319544a-948d-4b58-8892-93c5ebea8773" />


**Transakcija sėkminga:**

<img width="2164" height="174" alt="image" src="https://github.com/user-attachments/assets/972ab305-7318-4d15-b449-9a73efa8da7d" />


### 5.5 complete() – Depozito grąžinimas nuomininkui

#### Scenarijus 1: Depozito grąžinimas ✅

Kai inventorius tvarkingas, nuomininkas gauna pinigus atgal.

**MetaMask patvirtinimas:**

<img width="300" alt="image" src="https://github.com/user-attachments/assets/bd922c2a-a036-4a1c-955a-98acc2d0b932" />

**Transakcija sėkminga:**

<img width="2128" height="124" alt="image" src="https://github.com/user-attachments/assets/6f75e28b-887f-4b45-b832-de2cb25549a5" />

**Rezultatas:** Renter atgavo 0.05 ETH depozitą

<img width="600" alt="image" src="https://github.com/user-attachments/assets/5bd12dd0-3277-4e77-aa5c-2b9c64a5e6a6" />

### Sumų palyginimas

| Rolė | Pradinės sumos | Galutinės sumos |
|----------|----------------|---------------------|
| Renter | 0.1147 ETH | 0.01146 ETH |
| Owner | 0.0935 ETH | 0.0919 ETH |
| Inspector | 0.0578 ETH | 0.0578 ETH |


<img width="300" alt="image" src="https://github.com/user-attachments/assets/67ea728f-bf25-48e3-aad1-e9a5e9585b8b" />

_*Galutinės sumos = pradinės sumos, naudojamos antram scenarijui_

### 5.6 completeDamaged() – Pinigų grąžinimas savininkui

#### Scenarijus 2: Inventorius sugadintas ❌

Kai inventorius sugadintas, savininkas gauna pinigus kaip kompensaciją.

**confirmReturn(true) iškvieta:**

<img width="300" alt="image" src="https://github.com/user-attachments/assets/1e460a47-e512-4fee-a367-9eb83a3a754a" />

<img width="2124" height="104" alt="image" src="https://github.com/user-attachments/assets/13ccd80c-5262-42fb-bace-4bd48eeeadf8" />


**completeDamaged() iškviesta sėkmingai:**

<img width="2172" height="91" alt="image" src="https://github.com/user-attachments/assets/3a1abed9-9f69-48ea-9550-764aa0a20f76" />


**Rezultatas:** Owner gavo 0.05 ETH kompensaciją, Renter neatgavo

<img width="300" alt="image" src="https://github.com/user-attachments/assets/41a79b63-95ce-425c-869e-0781f3b6a01b" />



<img width="600" alt="image" src="https://github.com/user-attachments/assets/4fea80f5-226c-4445-9277-bf72a6ca8f2f" />


### Sumų palyginimas

| Rolė | Pradinės sumos | Galutinės sumos |
|----------|----------------|---------------------|
| Renter | 0.01146 ETH | 0.1403 ETH |
| Owner | 0.0919 | 0.0645 ETH |
| Inspector | 0.0578 ETH | 0.0578 ETH |

<img width="300" alt="image" src="https://github.com/user-attachments/assets/5d26624b-c458-4544-935a-ae21d08ffdfc" />

---

## 7. Etherscan logai 

Naudojau: https://sepolia.etherscan.io/
Visos transakcijos matomos Etherscan'e (tik kai jau su MetaMask dariau):

**Pirmo scenarijaus (inventorius tvarkingas):**

_Kontrakto adresas: 0x2C6441e643C00DDff2EB02Cc03eb06A2014F583c_

<img width="2779" height="780" alt="image" src="https://github.com/user-attachments/assets/24c827eb-d667-4f9f-b501-afd737bf1cfa" />

Sutartis grąžino nuomininkui 0.05 ETH
<img width="2752" height="482" alt="image" src="https://github.com/user-attachments/assets/843c9faf-ef3e-44ec-9843-d05c8ad672de" />


**Antro scenarijaus (inventorius sugadintas):**

_Kontrakto adresas: 0xb106819991ee15276B4d942225e02A256e10D450_

<img width="2786" height="776" alt="image" src="https://github.com/user-attachments/assets/3cbf8a28-9909-4bff-9bcd-5113b6a303d3" />

Sutartis pervedė nuomotojui 0.05 ETH
<img width="2791" height="376" alt="image" src="https://github.com/user-attachments/assets/aa031329-9827-4cf1-a3c5-0a186f3b0225" />

---

## 8. DApp (Front-End)

Sukūriau `index.html` failą, kuris leidžia:
- Prisijungti per MetaMask
- Įvesti contract'o adresą
- Iškviesti funkcijas: `rent()`, `markIssued()`, `confirmReturn()`, `complete()`

![Frontend](docs/frontend.png)

**Technologijos:**
- MetaMask
- ethers.js
- HTML + JavaScript

---

## 9. Pastaba dėl naudojamų įrankių

Projektui sąmoningai nenaudojau **Truffle** ar **Ganache**, nes laboratorinis darbas orientuotas į išmaniosios sutarties verslo logiką, jos testavimą ir realų naudojimą per decentralizuotą aplikaciją (DApp).

Testavimas buvo atliktas **Remix IDE** aplinkoje ir **Sepolia testnet**, kas leidžia patikrinti sutarties veikimą realiomis Ethereum tinklo sąlygomis (MetaMask, realūs sandoriai, gas mokesčiai, Etherscan logai).

---

## 10. Kaip paleisti

### Smart Contract:
1. Atidaryti **Remix IDE** → https://remix.ethereum.org
2. Įkelti `contracts/SportRent.sol`
3. Compile (Solidity 0.8.x)
4. Deploy:
   - **JavaScript VM** – lokalus testavimas
   - **Sepolia** – per MetaMask

### DApp:
1. Atidaryti `index.html` naršyklėje
2. Connect Wallet (MetaMask)
3. Įvesti contract'o adresą
4. Naudotis funkcijomis


