// contracts/contracts/PaymentRegistryContract.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title PaymentRegistryContract
 * @dev Logs key financial events for audit purposes. Access is restricted to the owner (trusted backend).
 */
contract PaymentRegistryContract {
    // === INLINE OWNABLE IMPLEMENTATION ===
    address private immutable _owner;

    modifier onlyOwner() {
        require(_owner == msg.sender, "Ownable: caller is not the owner");
        _;
    }

    constructor() {
        // Sets the deployer (trusted backend) as the owner.
        _owner = msg.sender;
    }
    
    function owner() public view returns (address) {
        return _owner;
    }

    // === DATA STRUCTURE (FIXED: 'indexed' removed) ===
    struct PaymentLog {
        bytes32 projectId; // FIXED: Removed 'indexed'
        address party;     // FIXED: Removed 'indexed'
        uint256 amount;
        uint256 timestamp;
        string transactionType;
    }

    PaymentLog[] public paymentLogs;

    // === EVENTS (The 'indexed' keyword is CORRECTLY used here) ===
    event LogAdded(bytes32 indexed projectId, string transactionType, uint256 amount);

    // === FUNCTIONALITY ===
    
    /**
     * @dev Logs a financial transaction event. Only callable by the contract owner.
     */
    function logTransaction(
        bytes32 _projectId, 
        address _party, 
        uint256 _amount, 
        string memory _type
    ) public onlyOwner { 
        
        paymentLogs.push(PaymentLog({
            projectId: _projectId,
            party: _party,
            amount: _amount,
            timestamp: block.timestamp,
            transactionType: _type
        }));

        // The data is correctly indexed when emitted in the event
        emit LogAdded(_projectId, _type, _amount);
    }

    function getLogCount() public view returns (uint256) {
        return paymentLogs.length;
    }
}