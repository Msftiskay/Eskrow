// contracts/contracts/MinimalEscrow.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MinimalEscrow {
    // === INLINE OWNABLE IMPLEMENTATION ===
    address private immutable _owner;

    modifier onlyOwner() {
        require(_owner == msg.sender, "Ownable: caller is not the owner");
        _;
    }
    
    // === INLINE REENTRANCYGUARD IMPLEMENTATION ===
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private _status;

    modifier nonReentrant() {
        _status = 2; // Sets status to REENTRANT
        require(_status == _NOT_ENTERED, "ReentrancyGuard: reentrant call");
        _;
        _status = _NOT_ENTERED; // Resets status to NOT_ENTERED
    }

    // === ENUMS ===
    enum ProjectStatus { PendingFunding, Active, Completed, Disputed, Cancelled }
    enum MilestoneStatus { Pending, Submitted, Approved }

    // STRUCTS
    struct Milestone {
        uint256 amount;
        MilestoneStatus status;
        bool paid;
    }

    struct Project {
        address client;
        address creative;
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 totalMilestonesSetAmount; 
        ProjectStatus status;
    }

    // STATE VARIABLES 
    mapping(bytes32 => Project) public projects;
    mapping(bytes32 => Milestone[]) public projectMilestones;
    mapping(bytes32 => bool) public isDisputed;
    
    uint256 public platformFeePercent = 2;
    uint256 public constant FEE_DENOMINATOR = 100;

    // Event to be emitted on various actions
    event FundsDeposited(bytes32 indexed projectId);
    event MilestoneApproved(bytes32 indexed projectId, uint256 milestoneIndex);
    event PaymentReleased(bytes32 indexed projectId, address indexed creative, uint256 amount, uint256 platformFee);
    event DisputeRaised(bytes32 indexed projectId, address indexed initiator);
    event ProjectCompleted(bytes32 indexed projectId);

    // MODIFIERS 
    modifier onlyClient(bytes32 _projectId) {
        require(projects[_projectId].client == msg.sender, "Not client");
        _;
    }

    modifier onlyCreative(bytes32 _projectId) {
        require(projects[_projectId].creative == msg.sender, "Not creative");
        _;
    }

    modifier projectExists(bytes32 _projectId) {
        require(projects[_projectId].client != address(0), "No project");
        _;
    }
    
    // CONSTRUCTOR
    constructor() {
        _owner = msg.sender;
        _status = _NOT_ENTERED; // Initialize ReentrancyGuard
    }
    
    // Owner view function for compatibility
    function owner() public view returns (address) {
        return _owner;
    }

    // Core contract functions
    function createProject(bytes32 _projectId, address _creative, uint256 _totalAmount) external {
        require(projects[_projectId].client == address(0), "Exists");
        require(_creative != msg.sender, "Self-funding disallowed");
        require(_totalAmount > 0, "Amount > 0");

        projects[_projectId] = Project({
            client: msg.sender,
            creative: _creative,
            totalAmount: _totalAmount,
            releasedAmount: 0,
            totalMilestonesSetAmount: 0,
            status: ProjectStatus.PendingFunding
        });
    }

    function depositFunds(bytes32 _projectId) external payable projectExists(_projectId) onlyClient(_projectId) {
        Project storage project = projects[_projectId];
        require(project.status == ProjectStatus.PendingFunding, "Not pending funding");
        require(msg.value == project.totalAmount, "Incorrect amount");

        project.status = ProjectStatus.Active;
        emit FundsDeposited(_projectId);
    }

    // Milestone management functions

    function addMilestone(bytes32 _projectId, uint256 _amount) external projectExists(_projectId) onlyClient(_projectId) {
        Project storage project = projects[_projectId];
        require(project.status == ProjectStatus.Active, "Not active");
        
        uint256 potentialTotal = project.totalMilestonesSetAmount + _amount;
        require(potentialTotal <= project.totalAmount, "Total exceeds project amount");

        project.totalMilestonesSetAmount = potentialTotal;

        projectMilestones[_projectId].push(Milestone({
            amount: _amount,
            status: MilestoneStatus.Pending,
            paid: false
        }));
    }

    function submitMilestone(bytes32 _projectId, uint256 _milestoneIndex) external projectExists(_projectId) onlyCreative(_projectId) {
        Milestone storage milestone = projectMilestones[_projectId][_milestoneIndex];
        require(milestone.status == MilestoneStatus.Pending, "Not pending");
        require(!milestone.paid, "Already paid");

        milestone.status = MilestoneStatus.Submitted;
    }

    function approveMilestone(bytes32 _projectId, uint256 _milestoneIndex) external nonReentrant projectExists(_projectId) onlyClient(_projectId) {
        Project storage project = projects[_projectId];
        Milestone storage milestone = projectMilestones[_projectId][_milestoneIndex];
        
        require(project.status == ProjectStatus.Active, "Not active");
        require(milestone.status == MilestoneStatus.Submitted, "Not submitted");
        require(!milestone.paid, "Already paid");

        milestone.status = MilestoneStatus.Approved;
        milestone.paid = true;

        uint256 platformFee = (milestone.amount * platformFeePercent) / FEE_DENOMINATOR;
        uint256 creativePayment = milestone.amount - platformFee;

        project.releasedAmount += milestone.amount;

        (bool success, ) = payable(project.creative).call{value: creativePayment}("");
        require(success, "Payment failed");

        emit MilestoneApproved(_projectId, _milestoneIndex);
        emit PaymentReleased(_projectId, project.creative, creativePayment, platformFee);

        if (project.releasedAmount == project.totalAmount) {
            project.status = ProjectStatus.Completed;
            emit ProjectCompleted(_projectId);
        }
    }

    // Dispute raising and reolution implementation

    function raiseDispute(bytes32 _projectId) external projectExists(_projectId) {
        Project storage project = projects[_projectId];
        require(msg.sender == project.client || msg.sender == project.creative, "Not party");
        require(project.status == ProjectStatus.Active, "Not active");
        require(!isDisputed[_projectId], "Dispute active");

        isDisputed[_projectId] = true;
        project.status = ProjectStatus.Disputed;

        emit DisputeRaised(_projectId, msg.sender);
    }

    function resolveDispute(bytes32 _projectId, uint256 _amountToCreative) external nonReentrant onlyOwner projectExists(_projectId) {
        Project storage project = projects[_projectId];
        require(project.status == ProjectStatus.Disputed, "Not disputed");

        uint256 heldFunds = project.totalAmount - project.releasedAmount;
        require(_amountToCreative <= heldFunds, "Invalid award amount");

        isDisputed[_projectId] = false;

        uint256 creativeFee = (_amountToCreative * platformFeePercent) / FEE_DENOMINATOR;
        uint256 creativePayment = _amountToCreative - creativeFee;
        
        project.releasedAmount += _amountToCreative;

        if (creativePayment > 0) {
            (bool success, ) = payable(project.creative).call{value: creativePayment}("");
            require(success, "Creative payment failed");
        }
        
        emit PaymentReleased(_projectId, project.creative, creativePayment, creativeFee);

        uint256 clientRefund = project.totalAmount - project.releasedAmount;
        if (clientRefund > 0) {
            (bool success, ) = payable(project.client).call{value: clientRefund}("");
            require(success, "Refund failed");
        }

        project.status = ProjectStatus.Completed;
        emit ProjectCompleted(_projectId);
    }
    
    function withdrawPlatformFees() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = payable(_owner).call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    // VIEW FUNCTIONS 
    function getProjectStatus(bytes32 _projectId) external view returns (ProjectStatus) {
        return projects[_projectId].status;
    }

    function getMilestone(bytes32 _projectId, uint256 _milestoneIndex)
        external
        view
        returns (
            uint256 amount,
            MilestoneStatus status,
            bool paid
        )
    {
        Milestone storage milestone = projectMilestones[_projectId][_milestoneIndex];
        return (
            milestone.amount,
            milestone.status,
            milestone.paid
        );
    }
}