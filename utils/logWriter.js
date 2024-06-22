const getDateTime = require("./dateUtil");

const logWriter = (type, message) => {
  console.log(`${type} @ ${message}`);
};

module.exports = logWriter;
