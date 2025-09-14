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
        InTransitToDistributor,  // 1: Shipped by manufacturer to distributor
        AtDistributor,           // 2: Received by distributor
        InTransitToRetailer,     // 3: Shipped by distributor to retailer
        AtRetailer,              // 4: Received by retailer
        Sold                     // 5: Marked as sold by retailer
    }

    // --- Core Data Structure ---
    // This struct is aligned with the BatchData interface in the TypeScript service.
    struct Batch {
        string batchId;
        uint256 quantity;
        string userId; // Associated user ID (e.g., from Clerk/Supabase)
        string internalBatchName;
        uint256 manufacturingDate;
        Status status;
        string currentLocation;
        address currentHolder;
        string[] history; // A log of all actions performed on the batch
    }

    // --- State Variables ---
    mapping(string => Batch) private batches;
    string[] private allBatchIds;
    mapping(string => string[]) private userBatches;

    // --- Events ---
    event BatchCreated(string batchId, string internalBatchName, uint256 quantity, string userId);
    event BatchStatusUpdated(string batchId, string newStatus, address by, string location);

    // --- Modifiers for Access Control ---
    modifier onlyRole(address role) {
        require(msg.sender == role, "Caller does not have the required role");
        _;
    }

    modifier batchExists(string memory _batchId) {
        // A batch exists if its manufacturingDate is not 0, which is set only on creation.
        require(batches[_batchId].manufacturingDate != 0, "Batch does not exist");
        _;
    }

    constructor(address _distributor, address _retailer) {
        manufacturer = msg.sender;
        distributor = _distributor;
        retailer = _retailer;
    }

    /**
     * @dev Allows the manufacturer to create a new batch of products.
     * The batch ID is provided by the client to link with off-chain data.
     * @param _batchId A unique identifier for the batch (e.g., UUID from frontend).
     * @param _quantity Number of items in the batch.
     * @param _userId The ID of the user creating the batch.
     * @param _internalBatchName A user-defined name or code for the batch.
     * @param _initialLocation The starting location of the batch.
     */
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
        newBatch.currentHolder = manufacturer;
        newBatch.history.push("Batch Created by Manufacturer");

        allBatchIds.push(_batchId);
        userBatches[_userId].push(_batchId);

        emit BatchCreated(_batchId, _internalBatchName, _quantity, _userId);
    }

    /**
     * @dev Updates the status of a batch, enforcing the supply chain workflow.
     * Also updates the batch's current holder and location.
     * @param _batchId The ID of the batch to update.
     * @param _newStatus The target status to move the batch to.
     * @param _newLocation The new physical location of the batch.
     */
    function updateBatchStatus(
        string memory _batchId,
        Status _newStatus,
        string memory _newLocation
    ) external batchExists(_batchId) {
        Batch storage batch = batches[_batchId];
        Status currentStatus = batch.status;
        string memory historyMessage;

        if (_newStatus == Status.InTransitToDistributor) {
            require(currentStatus == Status.Created, "Batch must be in Created state");
            require(msg.sender == manufacturer, "Only manufacturer can ship to distributor");
            historyMessage = "Shipped to Distributor";
        } else if (_newStatus == Status.AtDistributor) {
            require(currentStatus == Status.InTransitToDistributor, "Batch must be in transit to distributor");
            require(msg.sender == distributor, "Only distributor can receive batch");
            batch.currentHolder = distributor;
            historyMessage = "Received by Distributor";
        } else if (_newStatus == Status.InTransitToRetailer) {
            require(currentStatus == Status.AtDistributor, "Batch must be at distributor");
            require(msg.sender == distributor, "Only distributor can ship to retailer");
            historyMessage = "Shipped to Retailer";
        } else if (_newStatus == Status.AtRetailer) {
            require(currentStatus == Status.InTransitToRetailer, "Batch must be in transit to retailer");
            require(msg.sender == retailer, "Only retailer can receive batch");
            batch.currentHolder = retailer;
            historyMessage = "Received by Retailer";
        } else if (_newStatus == Status.Sold) {
            require(currentStatus == Status.AtRetailer, "Batch must be at retailer");
            require(msg.sender == retailer, "Only retailer can sell batch");
            historyMessage = "Batch marked as Sold";
        } else {
            revert("Invalid status transition");
        }

        batch.status = _newStatus;
        batch.currentLocation = _newLocation;
        batch.history.push(historyMessage);

        emit BatchStatusUpdated(_batchId, _getStatusString(_newStatus), msg.sender, _newLocation);
    }

    // ===== View Functions =====

    /**
     * @dev Retrieves all details for a specific batch, formatted for the client.
     * This is the 'getBatch' function your frontend service requires.
     */
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

    /**
     * @dev Returns an array of all batch IDs ever created.
     * This is the function to get all batch IDs that your frontend service requires.
     */
    function getAllBatchIds() external view returns (string[] memory) {
        return allBatchIds;
    }

    /**
     * @dev Returns an array of batch IDs created by a specific user.
     * Corresponds to `getBatchesByUser` in the TypeScript service.
     */
    function getBatchesByUser(string memory _userId) external view returns (string[] memory) {
        return userBatches[_userId];
    }
    
    /**
     * @dev Converts a Status enum to its string representation for easier client-side consumption.
     */
    function _getStatusString(Status _status) internal pure returns (string memory) {
        if (_status == Status.Created) return "Created";
        if (_status == Status.InTransitToDistributor) return "InTransitToDistributor";
        if (_status == Status.AtDistributor) return "AtDistributor";
        if (_status == Status.InTransitToRetailer) return "InTransitToRetailer";
        if (_status == Status.AtRetailer) return "AtRetailer";
        if (_status == Status.Sold) return "Sold";
        revert("Invalid status");
    }

    /**
     * @dev Returns the full history log for a specific batch.
     */
    function getBatchHistory(string memory _batchId) external view batchExists(_batchId) returns (string[] memory) {
        return batches[_batchId].history;
    }
    
    /**
     * @dev Returns the total number of batches created.
     */
    function getBatchCount() external view returns (uint256) {
        return allBatchIds.length;
    }

    /**
     * @dev Allows changing the distributor address. Only callable by the manufacturer.
     */
    function setDistributor(address _newDistributor) external onlyRole(manufacturer) {
        require(_newDistributor != address(0), "Invalid address");
        distributor = _newDistributor;
    }

    /**
     * @dev Allows changing the retailer address. Only callable by the manufacturer.
     */
    function setRetailer(address _newRetailer) external onlyRole(manufacturer) {
        require(_newRetailer != address(0), "Invalid address");
        retailer = _newRetailer;
    }
}

