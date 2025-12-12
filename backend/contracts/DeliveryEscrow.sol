// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DeliveryEscrow
 * @notice Escrow contract for delivery payments
 * @dev Funds are locked until delivery verification, then released to seller
 */
contract DeliveryEscrow {
    struct Escrow {
        address buyer;
        address seller;
        uint256 amount;
        bool released;
        bool refunded;
        uint256 createdAt;
        uint256 releaseDeadline; // Optional: auto-refund after deadline
    }
    
    mapping(bytes32 => Escrow) public escrows;
    address public owner; // Backend service address (authorized to release)
    
    event EscrowCreated(
        bytes32 indexed deliveryId,
        address indexed buyer,
        address indexed seller,
        uint256 amount
    );
    
    event EscrowReleased(
        bytes32 indexed deliveryId,
        address indexed seller,
        uint256 amount
    );
    
    event EscrowRefunded(
        bytes32 indexed deliveryId,
        address indexed buyer,
        uint256 amount
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }
    
    modifier escrowExists(bytes32 deliveryId) {
        require(escrows[deliveryId].buyer != address(0), "Escrow does not exist");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @notice Create escrow and deposit funds
     * @param deliveryId Unique delivery identifier (hashed to bytes32)
     * @param seller Seller wallet address
     */
    function deposit(bytes32 deliveryId, address seller) external payable {
        require(msg.value > 0, "Amount must be greater than 0");
        require(seller != address(0), "Invalid seller address");
        require(escrows[deliveryId].buyer == address(0), "Escrow already exists");
        
        escrows[deliveryId] = Escrow({
            buyer: msg.sender,
            seller: seller,
            amount: msg.value,
            released: false,
            refunded: false,
            createdAt: block.timestamp,
            releaseDeadline: block.timestamp + 30 days // 30-day auto-refund deadline
        });
        
        emit EscrowCreated(deliveryId, msg.sender, seller, msg.value);
    }
    
    /**
     * @notice Release escrow to seller (called by backend service after verification)
     * @param deliveryId Delivery identifier
     */
    function release(bytes32 deliveryId) external onlyOwner escrowExists(deliveryId) {
        Escrow storage escrow = escrows[deliveryId];
        require(!escrow.released, "Already released");
        require(!escrow.refunded, "Already refunded");
        
        escrow.released = true;
        
        (bool success, ) = escrow.seller.call{value: escrow.amount}("");
        require(success, "Transfer failed");
        
        emit EscrowReleased(deliveryId, escrow.seller, escrow.amount);
    }
    
    /**
     * @notice Refund escrow to buyer
     * @param deliveryId Delivery identifier
     */
    function refund(bytes32 deliveryId) external onlyOwner escrowExists(deliveryId) {
        Escrow storage escrow = escrows[deliveryId];
        require(!escrow.released, "Already released");
        require(!escrow.refunded, "Already refunded");
        
        escrow.refunded = true;
        
        (bool success, ) = escrow.buyer.call{value: escrow.amount}("");
        require(success, "Transfer failed");
        
        emit EscrowRefunded(deliveryId, escrow.buyer, escrow.amount);
    }
    
    /**
     * @notice Get escrow details
     * @param deliveryId Delivery identifier
     * @return Escrow struct with all details
     */
    function getEscrow(bytes32 deliveryId) external view returns (Escrow memory) {
        return escrows[deliveryId];
    }
    
    /**
     * @notice Check if escrow can be auto-refunded (past deadline)
     * @param deliveryId Delivery identifier
     * @return true if past deadline and not released/refunded
     */
    function canAutoRefund(bytes32 deliveryId) external view returns (bool) {
        Escrow storage escrow = escrows[deliveryId];
        return !escrow.released && 
               !escrow.refunded && 
               escrow.buyer != address(0) &&
               block.timestamp >= escrow.releaseDeadline;
    }
    
    /**
     * @notice Auto-refund if past deadline (anyone can call)
     * @param deliveryId Delivery identifier
     */
    function autoRefund(bytes32 deliveryId) external escrowExists(deliveryId) {
        Escrow storage escrow = escrows[deliveryId];
        require(!escrow.released, "Already released");
        require(!escrow.refunded, "Already refunded");
        require(block.timestamp >= escrow.releaseDeadline, "Deadline not reached");
        
        escrow.refunded = true;
        
        (bool success, ) = escrow.buyer.call{value: escrow.amount}("");
        require(success, "Transfer failed");
        
        emit EscrowRefunded(deliveryId, escrow.buyer, escrow.amount);
    }
}

