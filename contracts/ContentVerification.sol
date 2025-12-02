// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ContentVerification
 * @dev Smart contract for registering and verifying content authenticity on blockchain
 * @notice This contract allows publishers to register content hashes and users to verify them
 */
contract ContentVerification {
    // Content structure storing all metadata
    struct Content {
        bytes32 contentHash; // SHA-256 hash of the content
        uint256 timestamp; // Block timestamp when registered
        address publisher; // Wallet address of the publisher
        string contentType; // Type: "article", "image", "video"
        string ipfsMetadata; // IPFS hash for additional metadata
        bool exists; // Flag to check if content exists
    }

    // Reputation system for publishers
    struct PublisherReputation {
        uint256 totalRegistrations;
        uint256 verificationCount;
        uint256 reputationScore;
    }

    // Mappings
    mapping(bytes32 => Content) public contentRegistry;
    mapping(address => bytes32[]) public publisherContent;
    mapping(address => PublisherReputation) public publisherReputations;

    // State variables
    uint256 public totalRegistrations;
    address public owner;
    bool public paused;

    // Events
    event ContentRegistered(
        bytes32 indexed contentHash,
        address indexed publisher,
        uint256 timestamp,
        string contentType,
        string ipfsMetadata
    );

    event ContentVerified(
        bytes32 indexed contentHash,
        bool exists,
        address indexed verifier
    );

    event ContractPaused(address indexed by, uint256 timestamp);
    event ContractUnpaused(address indexed by, uint256 timestamp);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier validContentType(string memory _type) {
        require(
            keccak256(bytes(_type)) == keccak256(bytes("article")) ||
                keccak256(bytes(_type)) == keccak256(bytes("image")) ||
                keccak256(bytes(_type)) == keccak256(bytes("video")),
            "Invalid content type"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
        paused = false;
    }

    /**
     * @dev Register new content on the blockchain
     * @param _contentHash SHA-256 hash of the content
     * @param _contentType Type of content (article/image/video)
     * @param _ipfsMetadata IPFS hash containing additional metadata
     */
    function registerContent(
        bytes32 _contentHash,
        string memory _contentType,
        string memory _ipfsMetadata
    ) external whenNotPaused validContentType(_contentType) {
        require(_contentHash != bytes32(0), "Content hash cannot be empty");
        require(
            !contentRegistry[_contentHash].exists,
            "Content already registered"
        );
        require(bytes(_ipfsMetadata).length > 0, "IPFS metadata required");

        // Create content entry
        contentRegistry[_contentHash] = Content({
            contentHash: _contentHash,
            timestamp: block.timestamp,
            publisher: msg.sender,
            contentType: _contentType,
            ipfsMetadata: _ipfsMetadata,
            exists: true
        });

        // Update publisher records
        publisherContent[msg.sender].push(_contentHash);
        publisherReputations[msg.sender].totalRegistrations++;
        publisherReputations[msg.sender].reputationScore += 10;

        totalRegistrations++;

        emit ContentRegistered(
            _contentHash,
            msg.sender,
            block.timestamp,
            _contentType,
            _ipfsMetadata
        );
    }

    /**
     * @dev Verify if content exists and return its details
     * @param _contentHash Hash to verify
     * @return exists Whether content is registered
     * @return publisher Address of the publisher
     * @return timestamp When it was registered
     * @return contentType Type of content
     * @return ipfsMetadata IPFS hash
     */
    function verifyContent(
        bytes32 _contentHash
    )
        external
        returns (
            bool exists,
            address publisher,
            uint256 timestamp,
            string memory contentType,
            string memory ipfsMetadata
        )
    {
        Content memory content = contentRegistry[_contentHash];

        if (content.exists) {
            publisherReputations[content.publisher].verificationCount++;
            publisherReputations[content.publisher].reputationScore += 5;
        }

        emit ContentVerified(_contentHash, content.exists, msg.sender);

        return (
            content.exists,
            content.publisher,
            content.timestamp,
            content.contentType,
            content.ipfsMetadata
        );
    }

    /**
     * @dev Get all content registered by a publisher
     * @param _publisher Address of the publisher
     * @return Array of content hashes
     */
    function getPublisherContent(
        address _publisher
    ) external view returns (bytes32[] memory) {
        return publisherContent[_publisher];
    }

    /**
     * @dev Get publisher reputation details
     * @param _publisher Address of the publisher
     * @return totalRegistrations_ Total content registered
     * @return verificationCount Times their content was verified
     * @return reputationScore Overall reputation score
     */
    function getPublisherReputation(
        address _publisher
    )
        external
        view
        returns (
            uint256 totalRegistrations_,
            uint256 verificationCount,
            uint256 reputationScore
        )
    {
        PublisherReputation memory rep = publisherReputations[_publisher];
        return (
            rep.totalRegistrations,
            rep.verificationCount,
            rep.reputationScore
        );
    }

    /**
     * @dev Get total number of registrations
     * @return Total registrations count
     */
    function getTotalRegistrations() external view returns (uint256) {
        return totalRegistrations;
    }

    /**
     * @dev Get content details by hash
     * @param _contentHash Hash to query
     * @return Content struct
     */
    function getContentDetails(
        bytes32 _contentHash
    ) external view returns (Content memory) {
        return contentRegistry[_contentHash];
    }

    /**
     * @dev Emergency pause mechanism
     */
    function pause() external onlyOwner {
        paused = true;
        emit ContractPaused(msg.sender, block.timestamp);
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        paused = false;
        emit ContractUnpaused(msg.sender, block.timestamp);
    }
}
