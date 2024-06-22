exports.priceParser = (strPrice) => {
  return parseInt(strPrice.replace(/[^\d]/g, ""));
};

exports.formatPrice = (value) => {
  return value.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
};

exports.calTotalPrice = (ordersJson) => {
  let totalPrice = 0;
  for (let i = 0; i < ordersJson.length; i++) {
    totalPrice +=
      parseInt(ordersJson[i].foodPrice) * parseInt(ordersJson[i].foodQty);
  }
  return this.formatPrice(totalPrice);
};
