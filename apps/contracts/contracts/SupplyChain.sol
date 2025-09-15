// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title SupplyChain
 * @dev A smart contract to track batches of products through a supply chain,
 * aligned with modern frontend service requirements.
 */
contract SupplyChain {
    // --- Roles ---
    address public manufacturer;
    address public distributor;
    address public retailer;

    // --- State Machine for Batch Status ---
    enum Status {
        Created,                 // 0: Batch just created by manufacturer
        DispatchedByManufacturer,// 1: Shipped by manufacturer
        DeliveredToDistributor,  // 2: Received by distributor
        DispatchedByDistributor, // 3: Shipped by distributor
        DeliveredToRetailer,     // 4: Received by retailer
        DeliveredToConsumer      // 5: Marked as sold/delivered to consumer
    }

    // --- Core Data Structure ---
    struct Batch {
        string batchId;
        uint256 quantity;
        string userId;
        string internalBatchName;
        uint256 manufacturingDate;
        Status status;
        string currentLocation;
        address currentHolder;
        string[] history;
    }

    // --- State Variables ---
    mapping(string => Batch) private batches;
    string[] private allBatchIds;
    mapping(string => string[]) private userBatches;

    // --- Events ---
    event BatchCreated(string batchId, string internalBatchName, uint256 quantity, string userId);
    event BatchStatusUpdated(string batchId, string newStatus, address by, string location);
    event BatchTransferred(string batchId, address from, address to, string location);

    // --- Modifiers for Access Control ---
    modifier onlyRole(address role) {
        require(msg.sender == role, "Caller does not have the required role");
        _;
    }

    modifier batchExists(string memory _batchId) {
        require(batches[_batchId].manufacturingDate != 0, "Batch does not exist");
        _;
    }

    constructor(address _distributor, address _retailer) {
        manufacturer = msg.sender;
        distributor = _distributor;
        retailer = _retailer;
    }

    function createBatch(
        string memory _batchId,
        uint256 _quantity,
        string memory _userId,
        string memory _internalBatchName,
        string memory _initialLocation
    ) external onlyRole(manufacturer) {
        require(bytes(_batchId).length > 0, "Batch ID cannot be empty");
        require(batches[_batchId].manufacturingDate == 0, "Batch ID already exists");
        require(_quantity > 0, "Quantity must be greater than zero");

        Batch storage newBatch = batches[_batchId];
        newBatch.batchId = _batchId;
        newBatch.quantity = _quantity;
        newBatch.userId = _userId;
        newBatch.internalBatchName = _internalBatchName;
        newBatch.manufacturingDate = block.timestamp;
        newBatch.status = Status.Created;
        newBatch.currentLocation = _initialLocation;
        newBatch.currentHolder = manufacturer; // Correctly sets the manufacturer as the initial holder
        newBatch.history.push("Batch created by manufacturer");

        allBatchIds.push(_batchId);
        userBatches[_userId].push(_batchId);

        emit BatchCreated(_batchId, _internalBatchName, _quantity, _userId);
    }

    function updateBatchStatus(
        string memory _batchId,
        Status _newStatus,
        string memory _newLocation
    ) external batchExists(_batchId) {
        Batch storage batch = batches[_batchId];
        Status currentStatus = batch.status;
        string memory historyMessage;

        if (_newStatus == Status.DispatchedByManufacturer) {
            require(currentStatus == Status.Created, "Invalid status transition");
            require(msg.sender == manufacturer, "Only manufacturer can dispatch");
            historyMessage = "Dispatched by manufacturer";
        } else if (_newStatus == Status.DeliveredToDistributor) {
            require(currentStatus == Status.DispatchedByManufacturer, "Batch not dispatched by manufacturer");
            require(msg.sender == distributor, "Only distributor can receive");
            batch.currentHolder = distributor;
            historyMessage = "Delivered to distributor";
        } else if (_newStatus == Status.DispatchedByDistributor) {
            require(currentStatus == Status.DeliveredToDistributor, "Invalid status transition");
            require(msg.sender == distributor, "Only distributor can dispatch");
            historyMessage = "Dispatched by distributor";
        } else if (_newStatus == Status.DeliveredToRetailer) {
            require(currentStatus == Status.DispatchedByDistributor, "Batch not dispatched by distributor");
            require(msg.sender == retailer, "Only retailer can receive");
            batch.currentHolder = retailer;
            historyMessage = "Delivered to retailer";
        } else if (_newStatus == Status.DeliveredToConsumer) {
            require(currentStatus == Status.DeliveredToRetailer, "Batch not at retailer");
            require(msg.sender == retailer, "Only retailer can deliver to consumer");
            historyMessage = "Delivered to consumer";
        } else {
            revert("Invalid status transition");
        }

        batch.status = _newStatus;
        batch.currentLocation = _newLocation;
        batch.history.push(historyMessage);

        emit BatchStatusUpdated(_batchId, _getStatusString(_newStatus), msg.sender, _newLocation);
    }

    function transferBatchOwnership(
        string memory _batchId,
        address _newHolder,
        string memory _newLocation
    ) external batchExists(_batchId) {
        Batch storage batch = batches[_batchId];
        require(msg.sender == batch.currentHolder, "Only current holder can transfer");
        require(_newHolder != address(0), "Invalid new holder address");
        require(_newHolder != batch.currentHolder, "Cannot transfer to the same holder");

        address oldHolder = batch.currentHolder;
        batch.currentHolder = _newHolder;
        batch.currentLocation = _newLocation;

        string memory historyMessage = "Ownership transferred";
        batch.history.push(historyMessage);

        emit BatchTransferred(_batchId, oldHolder, _newHolder, _newLocation);
    }

    // ===== View Functions =====

    function batchExistsView(string memory _batchId) external view returns (bool) {
        return batches[_batchId].manufacturingDate != 0;
    }

    function getBatch(string memory _batchId)
        external
        view
        batchExists(_batchId)
        returns (
            string memory batchId,
            uint256 quantity,
            string memory userId,
            string memory internalBatchName,
            uint256 manufacturingDate,
            string memory status,
            string memory currentLocation,
            address currentHolder
        )
    {
        Batch storage b = batches[_batchId];
        return (
            b.batchId,
            b.quantity,
            b.userId,
            b.internalBatchName,
            b.manufacturingDate,
            _getStatusString(b.status),
            b.currentLocation,
            b.currentHolder
        );
    }

    function getAllBatchIds() external view returns (string[] memory) {
        return allBatchIds;
    }

    function getBatchesByUser(string memory _userId) external view returns (string[] memory) {
        return userBatches[_userId];
    }
    
    function _getStatusString(Status _status) internal pure returns (string memory) {
        if (_status == Status.Created) return "manufactured";
        if (_status == Status.DispatchedByManufacturer) return "dispatched by manufacturer";
        if (_status == Status.DeliveredToDistributor) return "delivered to distributor";
        if (_status == Status.DispatchedByDistributor) return "dispatched by distributor";
        if (_status == Status.DeliveredToRetailer) return "delivered to retailer";
        if (_status == Status.DeliveredToConsumer) return "delivered to consumer";
        revert("Invalid status");
    }

    function getBatchHistory(string memory _batchId) external view batchExists(_batchId) returns (string[] memory) {
        return batches[_batchId].history;
    }
    
    function getBatchCount() external view returns (uint256) {
        return allBatchIds.length;
    }

    function setDistributor(address _newDistributor) external onlyRole(manufacturer) {
        require(_newDistributor != address(0), "Invalid address");
        distributor = _newDistributor;
    }

    function setRetailer(address _newRetailer) external onlyRole(manufacturer) {
        require(_newRetailer != address(0), "Invalid address");
        retailer = _newRetailer;
    }

    function updateBatchHolder(string memory _batchId, address _newHolder) 
        external 
        onlyRole(manufacturer) 
        batchExists(_batchId) 
    {
        require(_newHolder != address(0), "Invalid holder address");
        batches[_batchId].currentHolder = _newHolder;
        batches[_batchId].history.push("Holder updated by manufacturer");
    }
}