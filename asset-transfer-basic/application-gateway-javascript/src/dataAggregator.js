const paillierBigint = require("paillier-bigint");
const helper = require("../util/helper.js");
const path = require('path');


exports.aggregateData = async () => {
  const jsonFilePath2 = path.join(__dirname, '..', 'test', 'user_data_encrpt.json');
  const userData = await helper.exportData(jsonFilePath2);
  // (asynchronous) creation of a random private, public key pair for the Paillier cryptosystem
  console.log("Starting Data Aggregation Process............");
  const { publicKey, privateKey } = await paillierBigint.generateRandomKeys(
    3072
  );
  const encryptData = {};
  const encryptUser = [];
  let encryptTotalData;
  const usersArray = userData.users;

  // Iterate through each user
  usersArray.forEach((user) => {
    const userId = user.user_id;
    // console.log(`User ID: ${userId}`);

    // Access the "data" array for each user
    const dataArray = user.data;
    const encryptedDataUser = {};
    encryptedDataUser.user_id = userId.toString();
    let encryptedUserMonthData;

    // Iterate through each data entry
    for (const dataEntry of dataArray) {
      const day = dataEntry.day;
      encryptedUserMonthData = BigInt(day);
      const hours = dataEntry.hours;

      for (const hour of hours) {
        encryptedUserMonthData = publicKey.addition(
          encryptedUserMonthData,
          BigInt(hour)
        );
      }
    }
    encryptTotalData = encryptedUserMonthData;

    encryptedDataUser.data = encryptedUserMonthData.toString();
    encryptUser.push(encryptedDataUser);
  });
  for (const user of encryptUser) {
    encryptTotalData = publicKey.addition(
      encryptTotalData,
      BigInt(user.data)
    );
  }
  encryptData.users = encryptUser;
  encryptData.total = encryptTotalData.toString();
  const jsonFilePath = path.join(__dirname, '..', 'test', 'user_data_aggregated.json');
  helper.storeEncrpty(encryptData, jsonFilePath);
  console.log("Data Aggregation Process Completed............");
  // console.log(encryptData);
};
