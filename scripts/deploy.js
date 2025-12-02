const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Starting deployment to Sepolia testnet...\n");

    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contract with account:", deployer.address);

    // Check balance
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(balance), "ETH\n");

    if (balance === 0n) {
        console.error("Insufficient funds. Get Sepolia ETH from faucet:");
        console.error("- https://sepoliafaucet.com");
        console.error("- https://www.infura.io/faucet/sepolia");
        process.exit(1);
    }

    // Deploy contract
    console.log("Deploying ContentVerification contract...");
    const ContentVerification = await hre.ethers.getContractFactory("ContentVerification");
    const contract = await ContentVerification.deploy();

    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    console.log("ContentVerification deployed to:", contractAddress);
    console.log("View on Etherscan: https://sepolia.etherscan.io/address/" + contractAddress);

    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        contractAddress: contractAddress,
        deployer: deployer.address,
        deploymentTime: new Date().toISOString(),
        blockNumber: await hre.ethers.provider.getBlockNumber()
    };

    const deploymentPath = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentPath)) {
        fs.mkdirSync(deploymentPath, { recursive: true });
    }

    fs.writeFileSync(
        path.join(deploymentPath, `${hre.network.name}.json`),
        JSON.stringify(deploymentInfo, null, 2)
    );

    // Save contract ABI for frontend
    const artifactPath = path.join(__dirname, "../artifacts/contracts/ContentVerification.sol/ContentVerification.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    const frontendConfigPath = path.join(__dirname, "../frontend/src/contracts");
    if (!fs.existsSync(frontendConfigPath)) {
        fs.mkdirSync(frontendConfigPath, { recursive: true });
    }

    fs.writeFileSync(
        path.join(frontendConfigPath, "ContentVerification.json"),
        JSON.stringify({
            address: contractAddress,
            abi: artifact.abi
        }, null, 2)
    );

    console.log("\nContract ABI and address saved to frontend/src/contracts/");
    console.log("\nWaiting 30 seconds before verification...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Verify contract on Etherscan
    if (hre.network.name !== "hardhat" && process.env.ETHERSCAN_API_KEY) {
        console.log("\n Verifying contract on Etherscan...");
        try {
            await hre.run("verify:verify", {
                address: contractAddress,
                constructorArguments: []
            });
            console.log("Contract verified on Etherscan");
        } catch (error) {
            console.log("Verification failed:", error.message);
        }
    }

    console.log("\nDeployment complete!");
    console.log("\nNext steps:");
    console.log("1.Update frontend/.env with contract address");
    console.log("2.cd frontend && npm install");
    console.log("3.npm start");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    });
