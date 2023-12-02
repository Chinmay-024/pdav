const paillier = require("../src/pallierClass.js");
const dataAggregator = require("../src/dataAggregator.js");
const fs = require("fs");
const helper = require("../util/helper.js");
const path = require("path");
// const plotly = require('plotly')('your-plotly-username', 'your-plotly-api-key');

// Function to measure the time taken for encryption
const measureEncryptionTime = async (userData) => {
  const start = performance.now();
  try {
    const jsonFilePath2 = path.join(
      __dirname,
      "../",
      "test",
      "user_data_encrpt.json"
    );
    const userData = await helper.exportData(jsonFilePath2);
    dataAggregator.aggregateData(userData);
    // await paillier.encryptData(userData);
    const end = performance.now();
    const timeTaken = end - start;
    console.log(
      `Time taken to Aggregator Data: ${(timeTaken.toFixed(2))} milliseconds`
    );
    return timeTaken;
  } catch (error) {
    console.error(`Error during encryption: ${error}`);
  }
};

// Function to generate filtered user data
// Function to generate filtered user data based on the number of days
const generateFilteredUserData = (originalUserData, numberOfUsers) => {
  return {
    users: originalUserData.users.slice(0, numberOfUsers),
  };
};


// Main execution
const numberOfUsers = 10; // Change this based on the actual number of users in your data

(async () => {
  const xValues = [];
  const yValues = [];

  const data = fs.readFileSync("./test/user_data.json", "utf8");
  const originalUserData = JSON.parse(data);

  for (let i = 1; i <= numberOfUsers; i++) {
    // Generate filtered user data
    console.log("No of user: ", i);
    const filteredUserData = generateFilteredUserData(originalUserData, i);

    // Measure encryption time for filtered user data
    const timeTaken = await measureEncryptionTime(filteredUserData);

    xValues.push(i);
    yValues.push(timeTaken.toFixed(2));
  }

  console.log(xValues, yValues);
  // Plot the graph
  //   plotGraph(xValues, yValues);
})();
