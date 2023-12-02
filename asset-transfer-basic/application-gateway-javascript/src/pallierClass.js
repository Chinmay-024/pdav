const paillierBigint = require("paillier-bigint");
const helper = require("../util/helper.js");
const path = require('path');



exports.encryptData = async (userData) => {
  // (asynchronous) creation of a random private, public key pair for the Paillier cryptosystem
  const { publicKey, privateKey } = await paillierBigint.generateRandomKeys(
    3072
  );
    console.log("Starting Encryption Process..........");
  // Optionally, you can create your public/private keys from known parameters
  // const publicKey = new paillierBigint.PublicKey(n, g)
  // const privateKey = new paillierBigint.PrivateKey(lambda, mu, publicKey)
    const encryptData = {};
    const encryptUser = [];
    const usersArray = userData.users;

  // Iterate through each user
  usersArray.forEach((user) => {
    const userId = user.user_id;
    const encryptedUserId = publicKey.encrypt(userId);
    // console.log(`User ID: ${userId}`);

    // Access the "data" array for each user
    const dataArray = user.data;
    const encryptedDataUser = {};
    encryptedDataUser.user_id = encryptedUserId.toString();
    const encryptedUserMonthData=[];

    // Iterate through each data entry
    dataArray.forEach((dataEntry) => {
      const encryptedDayEntry = {};
      const day = dataEntry.day;
      const encryptedDay = publicKey.encrypt(day);
      encryptedDayEntry.day = encryptedDay.toString();
      const hours = dataEntry.hours;
      const encryptedHours = [];

      hours.forEach((hour) => {
        const encryptedHour = publicKey.encrypt(hour);
        encryptedHours.push(encryptedHour.toString());
      })

      encryptedDayEntry.hours = encryptedHours;

      encryptedUserMonthData.push(encryptedDayEntry);

      // console.log(`Day: ${day}`);
      // console.log(`Hours: ${hours.join(", ")}`);
    });
    encryptedDataUser.data = encryptedUserMonthData;
    encryptUser.push(encryptedDataUser);
  });
  encryptData.users = encryptUser;

  const jsonFilePath = path.join(__dirname, '..', 'test', 'user_data_encrpt.json');
  helper.storeEncrpty(encryptData,jsonFilePath);
    console.log("Encryption Process Completed ..........");
    // console.log(encryptData);
};
