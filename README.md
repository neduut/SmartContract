# GoodsSale – Smart Contract + Decentralized Application

## 📌 Projekto paskirtis

Šis projektas įgyvendina **saugų prekių pirkimo–pardavimo modelį**, kuriame:
- Pirkėjas (Buyer)
- Pardavėjas (Seller)
- Kurjeris (Courier)

Prekės apmokėjimas vyksta per **escrow** principą – pinigai laikomi išmaniojoje sutartyje, kol pirkėjas patvirtina, jog prekė gauta.

---

# 1️⃣ Verslo modelis (aprašymas)

Procesas vyksta taip:

1. **Seller** deployina sutartį ir nustato:
   - prekių kainą (`price`)
   - kurjerio adresą (`courier`)

2. **Buyer** atlieka apmokėjimą (`pay()`) ir pinigai pereina į escrow.

3. **Seller** pažymi, kad prekė išsiųsta (`markShipped()`).

4. **Courier** pažymi, kad prekė pristatyta (`markDelivered()`).

5. **Buyer** patvirtina gavimą (`confirmReceived()`), o sutartis perveda lėšas **Seller**.

---

# 2️⃣ Sekų diagrama (Sequence Diagram)

Žemiau pateikiama proceso seka.

> **PASTABA:** čia įkelk PNG arba JPG paveikslėlį  
> **<!-- → ČIA ĮKELK DIAGRAMOS NUOTRAUKĄ: /docs/sequence.png -->**

### UML kodas (galima nukopijuoti į plantuml.com):

```plantuml
@startuml

actor Buyer
actor Seller
actor Courier
participant Contract

Buyer -> Contract: pay()
Contract -> Buyer: state = Paid

Seller -> Contract: markShipped()
Contract -> Seller: state = Shipped

Courier -> Contract: markDelivered()
Contract -> Courier: state = Delivered

Buyer -> Contract: confirmReceived()
Contract -> Seller: transfer funds
Contract -> Buyer: state = Completed

@enduml

3️⃣ Išmanioji sutartis (Smart Contract)

Failas: GoodsSale.sol

Visi kintamieji ir funkcijos:

buyer, seller, courier

price

enum State {Created, Paid, Shipped, Delivered, Completed}

Funkcijos:

pay() – vykdo pirkėjas

markShipped() – vykdo pardavėjas

markDelivered() – vykdo kurjeris

confirmReceived() – vykdo pirkėjas

4️⃣ Kontrakto veikimo įrodymai (lokalus testavimas)

ČIA ĮDĖK SCREENSHOT'US IŠ REMIX JS VM
(kiekvienas žingsnis atskirai)

Reikalingi screenshot’ai:

pay() pavyko

<!-- → /docs/pay.png -->

markShipped() pavyko

<!-- → /docs/shipped.png -->

markDelivered() pavyko

<!-- → /docs/delivered.png -->

confirmReceived() pavyko

<!-- → /docs/confirm.png -->

state reikšmės (0 → 1 → 2 → 3 → 4)

<!-- → /docs/state-flow.png -->
5️⃣ Deploy į Ethereum testnet (Sepolia)

Šį skyrių užpildysi po to, kai mes kartu deployinsim į Sepolia.
Aš tau padėsiu.

Kontrakto adresas:
[ČIA ĮKELK GALO KONTRAKTO ADRESĄ IŠ SEPOLIA]
<!-- → pakeisi kai deployinsim -->

Etherscan nuoroda:
[ČIA Etherscan nuoroda]

Tranzakcijų hash'ai:

Deploy txn:

<!-- → /docs/deploy-hash.png -->

pay() txn

markShipped() txn

markDelivered() txn

confirmReceived() txn

6️⃣ Front-End aplikacija (DApp)

Aplikacija sukurta naudojant ethers.js ir MetaMask.
Failas: index.html

Funkcionalumas:

Prisijungimas prie MetaMask

Kontrakto adreso įvedimas

Mygtukai:

Pay

Mark Shipped

Mark Delivered

Confirm Received

Statuso išvedimas

ČIA ĮKELK FRONT-END SCREENSHOT'Ą

<!-- → /docs/frontend.png -->
7️⃣ Kaip paleisti projektą
▶ Smart contract

Atidaryti Remix IDE

Importuoti GoodsSale.sol

Deploy į Sepolia (per MetaMask)

▶ Front-end

Atsidaryti index.html su naršykle

Paspausti Connect Wallet

Įvesti kontrakto adresą

Naudoti mygtukus pagal procesą
