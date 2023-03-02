const socket = io();
const orderContainer = document.getElementById("display-order");
const summaryContainer = document.getElementById("display-summary");
const roomContainer = document.getElementById("room-container");
const messageForm = document.getElementById("send-container");
const orderButton = document.querySelectorAll("#button-add");
const showButton = document.getElementById("showDialog");
const nameModal = document.getElementById("name-modal");
const txtuserName = document.getElementById("userName");
const confirmBtn = document.getElementById("confirmBtn");
const TOASTR_ERROR = "error";
const TOASTR_SUCCESS = "success";
const TOASTR_WARNING = "warning";
const ERROR = "400";
const SUCCESS = "200";
const PERMISSION_DENIED = "500";


var orderDetail = "";
var orderJson;
var cookieUserName = getCookie("userName");


socket.on("room-created", (room) => {
  const roomElement = document.createElement("div");
  roomElement.innerText = room;
  const roomLink = document.createElement("a");
  roomLink.href = `/${room}`;
  roomContainer.append(roomElement);
  roomContainer.append(roomLink);
});


// Delete Order
function confirmDelete(event) {
  let deletedOrder = {
    orderId: event.getAttribute("id"),
    roomName: event.getAttribute("data-room"),
    shopName: event.getAttribute("data-shop"),
    deleteUser: getCookie("userName"),
  };
  socket.emit("delete", deletedOrder);
}

// Send food oder detail
function sendOrder(event) {
  const userName = getCookie("userName");
  if (!userName || userName.length < 1) {
    // User name undefined
    return notify(
      TOASTR_ERROR,
      "Username undefined",
      "Please remove cookies then try again!"
    );
  }

  const orderDetail = {
    roomName: roomName,
    orderUser: userName,
    shopName: document.getElementById("txtShopName").innerText,
    foodTitle: document.getElementById("txtFoodName").innerText,
    foodPrice: document.getElementById("txtFoodPrice").innerText,
    orderTime: getCurrentTime(),
    foodQty: document.getElementById("txtFoodQty").value,
    foodNote: document.getElementById("txtNote").value,
  };
  closePopupConfirmOrder();
  socket.emit("order", orderDetail);
}

// Listen for new order
socket.on("new-order", (orderResult) => {
  switch (orderResult.status) {
    case SUCCESS:
      appendNewOrder(orderResult.newOrder);
      notify(
        TOASTR_SUCCESS,
        `Order Success`,
        `${orderResult.newOrder.orderUser} : ${orderResult.newOrder.foodTitle}`
      );
      break;

    default:
      notify(TOASTR_ERROR, "Order Failed", "Something went wrong");
      break;
  }
});

// Listen for updated order
socket.on("update-order", (updatedResult) => {
  switch (updatedResult.status) {
    case SUCCESS:
      appendUpdatedOrder(updatedResult.updatedOrder);
      notify(
        TOASTR_SUCCESS,
        `Updated Success`,
        `${updatedResult.updatedOrder.orderUser} : ${updatedResult.updatedOrder.foodTitle}`
      );
      break;

    default:
      notify(TOASTR_ERROR, "Update Failed", "Something went wrong");
      break;
  }
});

// Listen for delete order
socket.on("delete-order", (deleteResult) => {
  switch (deleteResult.status) {
    case SUCCESS:
      // Find order element and remove it
      const deletedOrder = document.getElementById(orderId);
      deletedOrder.parentNode.removeChild(deletedOrder);
      notify(
        TOASTR_SUCCESS,
        `Delete Success`,
        `${deleteResult.order.orderUser} : ${deleteResult.order.foodTitle}`
      );
      break;

    case PERMISSION_DENIED:
      notify(
        TOASTR_ERROR,
        `Delete Failed`,
        `Permission Denied`
      );

    default:
      // notify(TOASTR_ERROR, "Delete Failed", "Something went wrong");
      break;
  }
});

function appendNewOrder(newOrder) {
  const el = document.createElement("li");
  el.id = newOrder._id;
  el.setAttribute("onclick", "confirmDelete(this)");
  el.setAttribute("data-room", newOrder.roomName);
  el.setAttribute("data-shop", newOrder.shopName);

  el.innerHTML = `
            <span class="order-detail">
                <img class="user-avatar" alt="User Avatar" src="https://haycafe.vn/wp-content/uploads/2022/03/hinh-meo-hai-huoc.jpg">
                <div class="order-text">
                  <div id="order-info-1"><label id="user-txt">${newOrder.orderUser} </label><label id="order-time-txt">${newOrder.createdTime}</label></div>
                  <div id="order-info-2"><label id="food-amount-txt">${newOrder.foodQty} x </label>${newOrder.foodTitle} x ${newOrder.foodPrice}</div>
                  <div id="order-info-2"><label id="note-txt">Note: ${newOrder.foodNote}</label></div>
                </div>
            </span>
        `;
  orderContainer.appendChild(el);
}

function appendUpdatedOrder(updatedOrder) {

  const orderEl = document.getElementById(updatedOrder._id);
  orderEl.querySelector("#food-amount-txt").innerHTML = `${updatedOrder.foodQty} x `;
  orderEl.querySelector("#note-txt").innerHTML = `Note: ${updatedOrder.foodNote}`;
}

function appendSummary(summaryOrders) {
  while (summaryContainer.firstChild) {
    summaryContainer.removeChild(summaryContainer.firstChild);
  }
  let totalItems = 0;
  let totalPrice = 0;

  summaryOrders.forEach((sumDetail) => {
    const el = document.createElement("div");
    el.classList.add("summary-detail");
    el.innerHTML = `
        <div class="summary-info">
            <span class="sum-qty-txt">${sumDetail.foodQty}</span>
            <span class="sum-food-txt">${sumDetail.foodTitle}</span>
        </div>
        <div class="sum-total-txt">
            <span>${sumDetail.foodPrice},000đ</span>
        </div>
      `;
    summaryContainer.appendChild(el);
    totalItems += sumDetail.foodQty;
    totalPrice += sumDetail.foodPrice;
  });

  const subTotalEl = document.getElementById("sub-total-txt");
  subTotalEl.innerHTML = `Subtotal (${totalItems} items)`

  const totalPriceEl = document.getElementById("total-price-txt");
  totalPriceEl.innerHTML = `${totalPrice},000đ`;

}

// Popup confirm order
function showPopupConfirmOrder(e) {
  document.getElementsByClassName("modal-container")[0].className += " open";
  document.getElementById("popup-confirm").style.display = "block";

  // Fill form
  document.getElementById("txtFoodName").innerHTML =
    e.getAttribute("data-title");
  document.getElementById("txtFoodPrice").innerHTML =
    e.getAttribute("data-price");
  document.getElementById("txtFoodDes").innerHTML =
    e.getAttribute("data-des").length == 0
      ? `No description`
      : e.getAttribute("data-des");
}

function closePopupConfirmOrder() {
  document
    .getElementsByClassName("modal-container")[0]
    .classList.remove("open");
  document.getElementById("popup-confirm").style.display = "none";
}


// Display popup define username
if (cookieUserName == null || cookieUserName.length < 1) {
  document.getElementById("popup-username").classList.add('open');
} else {
  document.getElementById("popup-username").classList.remove('open');
  socket.emit("old-user", roomName, cookieUserName);
}

function confirmUserName() {
  userName = txtuserName.value;
  document.getElementById("popup-username").classList.remove('open');
  setCookie("userName", userName, 1);
  // appendLog('You joined')
  socket.emit("new-user", roomName, userName);
}

function setCookie(name, value, days) {
  var expires = "";
  if (days) {
    var date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(";");
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function eraseCookie(name) {
  document.cookie = name + "=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
}

// Notify message
function notify(type, mainMessage, subMessage) {
  toastr.options = {
    width: 400,
    progressBar: true,
    timeOut: 3000,
    extendedTimeOut: 2000,
    showMethod: "slideDown",
    hideMethod: "slideUp",
    closeMethod: "slideUp",
    closeButton: true,
  };

  switch (type) {
    case TOASTR_ERROR:
      return toastr.error(subMessage, mainMessage);
    case TOASTR_SUCCESS:
      return toastr.success(subMessage, mainMessage);
    case TOASTR_WARNING:
      return toastr.warning(subMessage, mainMessage);
  }
}

// Get Current Time
function getCurrentTime() {
  var currentDate = new Date();
  return (
    String(currentDate.getHours()).padStart(2, "0") +
    ":" +
    String(currentDate.getMinutes()).padStart(2, "0") +
    ":" +
    String(currentDate.getSeconds()).padStart(2, "0")
  );
}

const body = document.body;
const bgColorsBody = ["#ffb457", "#ff96bd", "#9999fb", "#ffe797", "#cffff1"];
const menu = body.querySelector(".menu");
const menuItems = menu.querySelectorAll(".menu__item");
// const menuBorder = menu.querySelector(".menu__border");
let activeItem = menu.querySelector(".active");

function clickItem(item, index) {
<<<<<<< HEAD
    menu.style.removeProperty("--timeOut");
    if (activeItem == item) return;
    if (activeItem) {
        activeItem.classList.remove("active");
    }
    item.classList.add("active");
    body.style.backgroundColor = bgColorsBody[index];
    activeItem = item;
    // offsetMenuBorder(activeItem, menuBorder);
=======

  menu.style.removeProperty("--timeOut");

  if (activeItem == item) return;

  if (activeItem) {
    activeItem.classList.remove("active");
  }


  item.classList.add("active");
  body.style.backgroundColor = bgColorsBody[index];
  activeItem = item;
  offsetMenuBorder(activeItem, menuBorder);


>>>>>>> 157a277c6385be9fcdae365b39d34305d266ba7c
}

// function offsetMenuBorder(element, menuBorder) {
//     const offsetActiveItem = element.getBoundingClientRect();
//     const left = Math.floor(offsetActiveItem.left - menu.offsetLeft - (menuBorder.offsetWidth  - offsetActiveItem.width) / 2) +  "px";
//     menuBorder.style.transform = `translate3d(${left}, 0 , 0)`;
// }

<<<<<<< HEAD
// offsetMenuBorder(activeItem, menuBorder);

menuItems.forEach((item, index) => {
    item.addEventListener("click", () => clickItem(item, index));
})

window.addEventListener("resize", () => {
    // offsetMenuBorder(activeItem, menuBorder);
    menu.style.setProperty("--timeOut", "none");
});
window.addEventListener("load", () => {
  body.style.backgroundColor = bgColorsBody[0];
=======
  const offsetActiveItem = element.getBoundingClientRect();
  const left = Math.floor(offsetActiveItem.left - menu.offsetLeft - (menuBorder.offsetWidth - offsetActiveItem.width) / 2) + "px";
  menuBorder.style.transform = `translate3d(${left}, 0 , 0)`;

}

offsetMenuBorder(activeItem, menuBorder);

menuItems.forEach((item, index) => {

  item.addEventListener("click", () => clickItem(item, index));

})

window.addEventListener("resize", () => {
  offsetMenuBorder(activeItem, menuBorder);
  menu.style.setProperty("--timeOut", "none");
>>>>>>> 157a277c6385be9fcdae365b39d34305d266ba7c
});