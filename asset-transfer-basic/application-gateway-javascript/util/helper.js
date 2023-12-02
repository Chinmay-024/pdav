const fs = require("fs");

exports.storeEncrpty = async (userData, jsonFilePath) => {
  // Convert the JavaScript object to a JSON-formatted string
  const jsonString = JSON.stringify(userData, null, 2);

  // Write the JSON string to the file
  fs.writeFile(jsonFilePath, jsonString, "utf8", (err) => {
    if (err) {
      console.error(`Error writing file: ${err}`);
    } else {
      // console.log(
      //   `JSON object has been successfully written to ${jsonFilePath}`
      // );
    }
  });
};

exports.exportData = async (jsonFilePath) => {
  const data = fs.readFileSync(jsonFilePath, "utf8", (err) => {
    if (err) {
      console.error(`Error reading file: ${err}`);
    } else {
      // console.log(
      //   `JSON object has been extracted from ${jsonFilePath}`
      // );
    }
  });
  try {
    const userData = JSON.parse(data);
    return userData;
  } catch (jsonError) {
    console.error(`Error parsing JSON: ${jsonError}`);
  }
};
