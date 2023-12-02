const paillier = require("./src/pallierClass.js");
const dataAggregator = require("./src/dataAggregator.js");
const fs = require("fs");
const zkSnark = require("./zkp/circuits/zkSnarks.js");

//write a code for than input from a json file and then encrypt it and then write it to a json file
const data = fs.readFileSync("./test/user_data.json", "utf8");
const a = async () => {
  try {
    const userData = JSON.parse(data);
    await paillier.encryptData(userData);
    await dataAggregator.aggregateData();
    zkSnark.verify();
  } catch (jsonError) {
    console.error(`Error parsing JSON: ${jsonError}`);
  }
};
a();
