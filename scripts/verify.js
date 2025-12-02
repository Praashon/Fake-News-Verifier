const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const deploymentPath = path.join(__dirname, `../deployments/${hre.network.name}.json`);

    if (!fs.existsSync(deploymentPath)) {
        console.error("Deployment file not found. Deploy contract first.");
        process.exit(1);
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    const contractAddress = deployment.contractAddress;

    console.log("Verifying contract at:", contractAddress);

    try {
        await hre.run("verify:verify", {
            address: contractAddress,
            constructorArguments: []
        });
        console.log("Contract verified successfully!");
    } catch (error) {
        console.error("Verification failed:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
