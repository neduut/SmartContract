📦 GoodsSale – Smart Contract + Decentralized Application
Laboratorinis darbas Nr. 4 · Ethereum · Solidity · DApp
📌 1. Projekto paskirtis

Šis projektas įgyvendina saugų decentralizuotą prekių pirkimo–pardavimo procesą, pagrįstą „escrow“ principu.
Lėšos laikomos išmaniojoje sutartyje, kol pirkėjas patvirtina, kad prekė gauta.
Taip užtikrinama, kad:

🚫 Pardavėjas negali pasiimti pinigų prieš laiką

🚫 Pirkėjas negali neatlikti apmokėjimo po pristatymo

🚫 Kurjeris negali patvirtinti neteisingo pristatymo

✔ Procesas vyksta viešame blockchain tinkle, garantuojant vientisumą

Ši logika padeda suprasti realias Web3 taikymo galimybes praktikoje.

🧭 2. Verslo modelio dalyviai
Rolė	Aprašymas
Seller	Parduoda prekę, įkelia kainą, nurodo kurjerį
Buyer	Atlieka mokėjimą ir patvirtina gavimą
Courier	Pažymi, kad pristatė prekę
Contract	Laiko pinigus ir valdo būsenas
🔄 3. Proceso eiga

Seller deployina kontraktą, nurodo:
• kainą (price)
• kurjerio adresą

Buyer atlieka apmokėjimą (pay())
→ kontraktas pereina į Paid būseną

Seller pažymi išsiuntimą (markShipped())
→ būklė tampa Shipped

Courier pažymi pristatymą (markDelivered())
→ būklė tampa Delivered

Buyer patvirtina gavimą (confirmReceived())
→ kontraktas perveda pinigus Seller'iui
→ būsena tampa Completed

🧩 4. Sekų (sequence) diagrama

👉 Įkelk savo PNG failą į docs/sequence.png

![Sequence Diagram](docs/sequence.png)


UML kodas (naudota generavimui):

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

🔐 5. Smart Contract analizė

Failas: GoodsSale.sol
Programavimo kalba: Solidity 0.8.30

🔸 Kintamieji

buyer – pirkėjo adresas

seller – deploy’eris

courier – kurjerio adresas

price – kaina wei vienetais

enum State – būsenų mašina

🔸 Apsaugos
Rizika	Sprendimas
Front-running buyer	Buyer = msg.sender nustatomas prieš require
Netinkama būsena	Kiekviena funkcija naudoja inState() modifier
Reentrancy	ETH išmokėjimas atliekamas paskutinis
🧪 6. Lokalus testavimas (Remix VM)
6.1 Deploy (Seller)

<img width="2123" height="927" alt="image" src="https://github.com/user-attachments/assets/1cf94a14-7d60-47c0-9220-acff5ca25240" />
<img width="2144" height="680" alt="image" src="https://github.com/user-attachments/assets/d0ea92ef-5a3a-4f90-872b-52f91be4fe57" />


6.2 Buyer → pay()

<img width="2164" height="832" alt="image" src="https://github.com/user-attachments/assets/899bb1a0-5374-4887-bc61-9eadad36de28" />

6.3 Seller → markShipped()

<img width="2169" height="290" alt="image" src="https://github.com/user-attachments/assets/97965b89-5921-4bbb-8d49-532a7c0f9dc1" />

6.4 Courier → markDelivered()

<img width="2156" height="336" alt="image" src="https://github.com/user-attachments/assets/247af1b5-3704-47fd-b7f2-c1a507322ca2" />

6.5 Buyer → confirmReceived()

<img width="2175" height="858" alt="image" src="https://github.com/user-attachments/assets/4c9cbb1f-521a-4910-99d7-93a2b509a36b" />

6.6 Galutinė būsena

<img width="551" height="1216" alt="image" src="https://github.com/user-attachments/assets/d260c85e-460e-45b1-9159-0764f4d6e613" />


🌐 7. Deploy į Ethereum Testnet (Sepolia)

(Šį skyrių užpildysime kartu — aš tau padėsiu.)

Kontrakto adresas:

Etherscan nuoroda:

Transakcijų hash’ai:

Deploy

pay()

markShipped()

markDelivered()

confirmReceived()

🖥 8. Front-End aplikacija (index.html)

Aplikacija leidžia:

Prisijungti prie MetaMask

Įvesti kontrakto adresą

Vykdyti 4 funkcijas

Matyti būsenos pokyčius

👉 Įkelk screenshot:

docs/frontend.png
