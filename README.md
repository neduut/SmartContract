# SportRent – Sporto Inventoriaus Nuomos Sutartis

**Laboratorinis darbas Nr. 4** · Blockchain · Ethereum · Solidity

---

## 1. Trumpas aprašymas

Šiame projekte sukūriau išmaniąją sutartį sporto inventoriaus nuomai. Naudojau **escrow** logiką - saugų atsiskaitymą per smart contract, kad nei savininkas, nei nuomininkas nerizikuotų prarasti pinigų ar inventoriaus.

**Realaus pasaulio panaudojimo atvejai:**
- ⛷️ **Slidinėjimo įrangos nuoma** slidinėjimo kurorte
- 🏄 **Banglentių nuoma** atostogų metu paplūdimyje
- 🚴 **Dviračių nuoma** turistams mieste
- 🎾 **Teniso rakės nuoma** turnyrui ar treniruotei

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
4. Renter naudoja 3 dienas ir grąžina
5. Inspector apžiūri → viskas tvarkingas
6. Owner užbaigia → Renter gauna depozitą atgal ✅

**Scenarijus B: Sugadintas inventorius**
1-4. [Kaip Scenarijus A]
5. Inspector apžiūri → randa pažeidimą
6. Owner užbaigia → Owner gauna depozitą kaip kompensaciją ❌

---

## 3. Sekų diagrama

![Sequence Diagram](img/seku_diagrama.png)
Pqarašiau PlantUML kodą ir generavau su: https://plantuml.com/

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

Testavau kontraktą **Remix IDE** su **JavaScript VM**:
<img width="500" height="489" alt="image" src="https://github.com/user-attachments/assets/10fb4565-ad19-4f0f-95ed-a3df05cfdcc1" />


### 5.1 Deploy
<img width="494" height="728" alt="image" src="https://github.com/user-attachments/assets/de7c24a1-8299-4726-9760-706ec56e9b27" />

<img width="516" height="496" alt="image" src="https://github.com/user-attachments/assets/0585c272-9bb8-422f-b3f0-1031e8a6e1b6" />
<img width="1495" height="75" alt="image" src="https://github.com/user-attachments/assets/e95b7ec0-afa6-4230-b8a7-899c7c5b58ac" />

### 5.2 rent() – Depozito mokėjimas
<img width="1856" height="98" alt="image" src="https://github.com/user-attachments/assets/b68b25c9-2ef3-4510-ba7e-9688ccc493e1" />
<img width="484" height="226" alt="image" src="https://github.com/user-attachments/assets/b023920a-8202-425e-b41b-ad6175fa733f" />


### 5.3 markIssued() – Išdavimo patvirtinimas
<img width="1641" height="98" alt="image" src="https://github.com/user-attachments/assets/30f3112e-f220-4658-a865-a8815a5a2c47" />


### 5.4 confirmReturn() – Inspektoriaus tikrinimas
Scenarijus 1 – inventorius tvarkingas (damaged = false
):
<img width="505" height="285" alt="image" src="https://github.com/user-attachments/assets/2035cc53-c541-4f80-bdc1-ed368bde088e" />

<img width="1746" height="88" alt="image" src="https://github.com/user-attachments/assets/1efa9531-b72d-4cba-b322-6bcfd89a545b" />

### 5.5 complete() – Pinigų grąžinimas
<img width="1590" height="96" alt="image" src="https://github.com/user-attachments/assets/dfa65ca0-4c52-4fa9-8c97-214cf015a04f" />
<img width="497" height="294" alt="image" src="https://github.com/user-attachments/assets/283caa95-69b5-44b9-a1b7-e25cb1df6f40" />
Renter atgavo 1 ETH.

Scenarijus 2 – inventorius sugadintas (damaged = true
):
<img width="498" height="289" alt="image" src="https://github.com/user-attachments/assets/eab08a44-972f-49f4-8dac-51c9d8c2117c" />
<img width="1717" height="116" alt="image" src="https://github.com/user-attachments/assets/a209bb28-a4a6-4c50-be24-30c2d9f51aff" />


### 5.5 complete() – Pinigai negrąžinami
<img width="1737" height="96" alt="image" src="https://github.com/user-attachments/assets/c63f15ff-5979-4f8e-ab5c-9ce9b3c93f80" />
<img width="482" height="206" alt="image" src="https://github.com/user-attachments/assets/f83e8e13-0e5f-464e-9112-a302fd7b2790" />
Renter neatgavo 1 ETH, o Sporto parduotuvė užsidirbo 1 ETH.


---

## 6. Sepolia testnet deployment

Po lokalaus testavimo deploy'inau į **Sepolia testnet**:

**Procesas:**
1. MetaMask perjungimas į Sepolia
2. Test ETH gavimas: https://sepolia-faucet.pk910.de/
3. Remix → Injected Provider
4. Deploy ir funkcijų iškvietimas
5. Patikrinimas Etherscan'e

---

## 7. Etherscan logai

Visos transakcijos matomos Etherscan'e:

![Etherscan](docs/etherscan.png)

---

## 8. DApp (Front-End)

Sukūriau minimalistinį `index.html` failą, kuris leidžia:
- Prisijungti per MetaMask
- Įvesti contract'o adresą
- Iškviesti funkcijas: `rent()`, `markIssued()`, `confirmReturn()`, `complete()`

![Frontend](docs/frontend.png)

**Technologijos:**
- MetaMask
- ethers.js
- HTML + JavaScript

---

## 9. Kaip paleisti

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


