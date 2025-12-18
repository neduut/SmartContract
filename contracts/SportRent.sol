// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SportRent {

    // --- Roles ---
    address public owner;       // Inventoriaus savininkas
    address public renter;      // Nuomininkas (nusistatys rent() metu)
    address public inspector;   // Inventoriaus būklės tikrintojas

    // --- Economics ---
    uint256 public deposit;     // Užstatas, kurį sumoka renter

    // --- State machine ---
    enum State { Created, Rented, Issued, ReturnedOk, ReturnedDamaged, Completed }
    State public state;

    // --- Events ---
    event Rented(address renter, uint256 deposit);
    event Issued();
    event Returned(bool damaged);
    event Completed(address to, uint256 amount);

    // --- Modifiers ---
    
    /// Tik tada, kai esame konkrečioje būsenoje
    modifier inState(State expected) {
        require(state == expected, "Invalid state for this action");
        _;
    }

    /// Tik owner gali vykdyti šį veiksmą
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    /// Tik renter gali vykdyti
    modifier onlyRenter() {
        require(msg.sender == renter, "Only renter");
        _;
    }

    /// Tik inspector gali vykdyti
    modifier onlyInspector() {
        require(msg.sender == inspector, "Only inspector");
        _;
    }

    /**
     * @notice Owner sukuria pasiūlymą, nurodo depozitą ir inspektorių
     */
    constructor(uint256 _deposit, address _inspector) {
        require(_inspector != address(0), "Invalid inspector address");
        require(_deposit > 0, "Deposit must be greater than 0");
        
        owner = msg.sender;
        deposit = _deposit;
        inspector = _inspector;
        state = State.Created;
    }

    /**
     * @notice Fallbacks — blokavimas, kad niekas nesiųstų ETH netyčia
     */
    receive() external payable {
        revert("Direct payments not allowed");
    }

    fallback() external payable {
        revert("Invalid call");
    }

    /**
     * @notice Renter sumoka depozitą ir nuomojasi inventorių
     */
    function rent() external payable inState(State.Created) {
        require(renter == address(0), "Already rented");
        require(msg.value == deposit, "Incorrect deposit amount");

        renter = msg.sender;
        state = State.Rented;

        emit Rented(renter, msg.value);
    }

    /**
     * @notice Owner pažymi, kad inventorius išduotas renter'iui
     */
    function markIssued() external onlyOwner inState(State.Rented) {
        state = State.Issued;
        emit Issued();
    }

    /**
     * @notice Inspector tikrina inventorių ir patvirtina grąžinimą
     * @param damaged true jei inventorius sugadintas, false jei tvarkingas
     */
    function confirmReturn(bool damaged) 
        external 
        onlyInspector 
        inState(State.Issued) 
    {
        if (damaged) {
            state = State.ReturnedDamaged;
        } else {
            state = State.ReturnedOk;
        }

        emit Returned(damaged);
    }

    /**
     * @notice Baigiamasis žingsnis — pinigų išmokėjimas pagal būseną
     */
    function complete() external inState(State.ReturnedOk) onlyOwner {
        // Tvarkinga → grąžinam depozitą renter'iui
        uint256 amount = address(this).balance;

        // Reentrancy protection: Checks-Effects-Interactions pattern
        state = State.Completed;  // Effects first
        
        // Interactions last
        payable(renter).transfer(amount);

        emit Completed(renter, amount);
    }

    function completeDamaged() external inState(State.ReturnedDamaged) onlyOwner {
        // Sugadinta → depozitas atitenka owner'iui
        uint256 amount = address(this).balance;

        // Reentrancy protection: Checks-Effects-Interactions pattern
        state = State.Completed;  // Effects first
        
        // Interactions last
        payable(owner).transfer(amount);

        emit Completed(owner, amount);
    }
}
