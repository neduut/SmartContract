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

![Sequence Diagram](docs/sequence.png)

### ASCII sekų schema:

```
┌─────────┐          ┌─────────┐          ┌───────────┐          ┌──────────────┐
│  Owner  │          │ Renter  │          │ Inspector │          │   Contract   │
└────┬────┘          └────┬────┘          └─────┬─────┘          └──────┬───────┘
     │                    │                     │                       │
     ├─────── (1) constructor(deposit, inspector) ──────────────────────>│
     │                    │                     │              state = Created
     │<────────────────── Contract Address ────────────────────────────┤
     │                    │                     │                       │
     │                    ├─── (2) rent() + deposit ETH ───────────────>│
     │                    │                     │         renter = msg.sender
     │                    │                     │              state = Rented
     │                    │<────── Deposit Locked ──────────────────────┤
     │                    │                     │                       │
     ├── (3) 🎾 Fiziškai išduoda inventorių ───>│                       │
     ├────────────── markIssued() ──────────────────────────────────────>│
     │                    │                     │              state = Issued
     │<───────────── Issue Confirmed ──────────────────────────────────┤
     │                    │                     │                       │
     │<────── (4) 🎾 Fiziškai grąžina ──────────┤                       │
     │                    │                     │                       │
     │                    │      ┌──────────────┴───────────────┐       │
     │                    │      │ Inspector apžiūri fiziškai   │       │
     │                    │      └──────────────┬───────────────┘       │
     │                    │                     │                       │
     │                    │         ┌─────── (5) confirmReturn(false) ──>│  [TVARKINGAS]
     │                    │         │           │         state = ReturnedOk
     │────────── (6A) complete() ──┼───────────┼───────────────────────>│
     │                    │         │           │         state = Completed
     │                    │<────────┼───────────┼── 💰 deposit ETH ─────┤  Refund!
     │                    │         │           │                       │
     │                    │         └─ (5) confirmReturn(true) ─────────>│  [SUGADINTAS]
     │                    │                     │       state = ReturnedDamaged
     ├────────── (6B) completeDamaged() ───────┼───────────────────────>│
     │                    │                     │         state = Completed
     │<───────────────────┼─────────────────────┼── 💰 deposit ETH ─────┤  Compensation!
     │                    │                     │                       │
     ▼                    ▼                     ▼                       ▼
```

### PlantUML kodas:

```plantuml
@startuml
actor Owner
actor Renter
actor Inspector
participant Contract

Owner -> Contract: constructor(deposit, inspector)
Contract --> Owner: state = Created

Renter -> Contract: rent() + deposit
Contract --> Renter: state = Rented

Owner -> Contract: markIssued()
Contract --> Owner: state = Issued

Inspector -> Contract: confirmReturn(damaged)
alt damaged = false
    Contract --> Inspector: state = ReturnedOk
    Owner -> Contract: complete()
    Contract -> Renter: transfer(deposit)
else damaged = true
    Contract --> Inspector: state = ReturnedDamaged
    Owner -> Contract: completeDamaged()
    Contract -> Owner: transfer(deposit)
end
@enduml
```

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

### 5.1 Deploy
![Deploy](docs/deploy.png)

### 5.2 rent() – Depozito mokėjimas
![Rent](docs/rent.png)

### 5.3 markIssued() – Išdavimo patvirtinimas
![Issued](docs/issued.png)

### 5.4 confirmReturn() – Inspektoriaus tikrinimas
![Inspect](docs/inspect.png)

### 5.5 complete() – Pinigų išmokėjimas
![Complete](docs/complete.png)

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

---

**Autorius:** Nedas  
**Projektas:** Blockchain laboratorinis darbas  
**Data:** 2025-12

