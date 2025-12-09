// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract GoodsSale {
    address public buyer;
    address public seller;
    address public courier;
    uint public price;

    enum State { Created, Paid, Shipped, Delivered, Completed }
    State public state;

    constructor(uint _price, address _courier) {
        seller = msg.sender;
        price = _price;
        courier = _courier;
        state = State.Created;
    }

    modifier onlyBuyer() {
        require(msg.sender == buyer, "Not buyer");
        _;
    }

    modifier onlySeller() {
        require(msg.sender == seller, "Not seller");
        _;
    }

    modifier onlyCourier() {
        require(msg.sender == courier, "Not courier");
        _;
    }

    modifier inState(State _state) {
        require(state == _state, "Invalid state");
        _;
    }

    function pay() external payable inState(State.Created) {
    buyer = msg.sender;  
    require(msg.value == price, "Incorrect value");
    state = State.Paid;
    }


    function markShipped() external onlySeller inState(State.Paid) {
        state = State.Shipped;
    }

    function markDelivered() external onlyCourier inState(State.Shipped) {
        state = State.Delivered;
    }

    function confirmReceived() external onlyBuyer inState(State.Delivered) {
        state = State.Completed;
        (bool success, ) = seller.call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }
}
