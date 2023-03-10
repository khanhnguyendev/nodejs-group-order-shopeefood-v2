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
    deleteUser: getCookie("userName"),
    roomId: event.getAttribute("data-room-id"),
    deliveryId: event.getAttribute("data-delivery-id"),
  };
  socket.emit("delete", deletedOrder);
}

// Send food oder detail
function sendOrder() {
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
socket.on("new-order", async (orderResult) => {
  switch (orderResult.status) {
    case SUCCESS:
      // append new order
      appendNewOrder(orderResult.newOrder);
      // update summary
      await updateSummary();
      // notify new order status
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
socket.on("update-order", async (updatedResult) => {
  switch (updatedResult.status) {
    case SUCCESS:
      // update order list
      appendUpdatedOrder(updatedResult.updatedOrder);
      // update summary
      await updateSummary();
      // notify update order status
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
socket.on("delete-order", async (deleteResult) => {
  switch (deleteResult.status) {
    case SUCCESS:
      // Find and delete order by id
      const deletedOrder = document.getElementById(deleteResult.order._id);
      deletedOrder.parentNode.removeChild(deletedOrder);
      // update summary
      await updateSummary();
      // notify delete status
      notify(
        TOASTR_SUCCESS,
        `Delete Success`,
        `${deleteResult.order.orderUser} : ${deleteResult.order.foodTitle}`
      );
      break;

    case PERMISSION_DENIED:
      // notify delete status
      notify(TOASTR_ERROR, `Delete Failed`, `Permission Denied`);

    default:
      // notify(TOASTR_ERROR, "Delete Failed", "Something went wrong");
      break;
  }
});

async function updateSummary() {
  await fetch(`/API/getOrder?roomId=${roomId}&requestId=${deliveryId}`, {})
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not OK");
      }
      return response.json();
    })

    .then(function (data) {
      appendSummary(data);
    })

    .catch(function (err) {
      console.log(err);
    });

  function appendSummary(data) {
    while (summaryContainer.firstChild) {
      summaryContainer.removeChild(summaryContainer.firstChild);
    }
    let totalItems = 0;
    let totalPrice = 0;
    let orders = data.reply;

    const summaryOrders = orders.reduce((acc, curr) => {
      const existing = acc.find(item => item.foodTitle === curr.foodTitle);
      
      if (existing) {
        existing.foodQty += curr.foodQty;
        existing.totalPrice += curr.foodPrice;
        existing.foodNote.push({
          userName: curr.orderUser,
          note: curr.foodNote,
          id: curr._id
        });
      } else {
        acc.push({
          foodTitle: curr.foodTitle,
          foodNote: [{
            userName: curr.orderUser,
            note: curr.foodNote,
            id: curr._id
          }],
          foodQty: curr.foodQty,
          totalPrice: curr.foodPrice
        });
      }
      
      return acc;
    }, []);

    summaryOrders.forEach((order,index) => {
      const el = document.createElement("div");
      el.classList.add("summary-detail");
      let content='';
      content = `
            <div class="summary-info">
                <span class="sum-qty-txt">${order.foodQty}</span>
                <span class="sum-food-txt">${order.foodTitle}</span>`;
      if(order.foodNote.length != 0) {
        order.foodNote.forEach((note,noteIndex) => {
          if(noteIndex == 0) {
            content += `
              <button class="btn btn-primary expand-button" type="button" data-bs-toggle="collapse" data-bs-target="#sum-${index}" aria-expanded="false" aria-controls="sum-${index}">+</button>
              <div class="row expand-content">
                <div class="collapse multi-collapse" id="sum-${index}">
                  <div class="sum-user-note">`
          }
          content += `<p id="${note.id}">${note.userName} : ${note.note} </p>`;
        })
        content += `
              </div>
            </div>
          </div>
        </div>
        <div class="sum-total-txt">
          <span>${formatPrice(order.totalPrice)}</span>
        </div>
        `;
      }
      el.innerHTML = content;
      summaryContainer.appendChild(el);
      totalItems += order.foodQty;
      totalPrice += order.totalPrice;
    });

    const subTotalEl = document.getElementById("sub-total-txt");
    subTotalEl.innerHTML = `Subtotal (${totalItems} items)`;

    const totalPriceEl = document.getElementById("total-price-txt");
    totalPriceEl.innerHTML = `${formatPrice(totalPrice)}`;
  }
}

function appendNewOrder(newOrder) {
  const el = document.createElement("li");
  el.id = newOrder._id;
  el.setAttribute("onclick", "confirmDelete(this)");
  el.setAttribute("data-room-id", newOrder.roomId);
  el.setAttribute("data-delivery-id", newOrder.deliveryId);

  let divFoodNote = ``;
  if (newOrder.foodNote) {
    divFoodNote = `
      <div id="order-info-note">
        <span class="note-txt">${newOrder.foodNote}</span>
      </div>`;
  }

  el.innerHTML = `
            <div class="order-detail">
              <img class="user-avatar" alt="User Avatar"
                src="https://haycafe.vn/wp-content/uploads/2022/03/hinh-meo-hai-huoc.jpg">
              <div class="order-text">
                <div class="order-info order-info-name">
                  <span class="user-txt">${newOrder.orderUser}</span>
                  <span class="order-time-txt">${newOrder.createdTime}</span>
                </div>
                <div class="order-info order-info-title">
                  <span class="food-amount-txt">${newOrder.foodQty}</span>
                  <span> x </span>
                  <span class="order-title-txt">${newOrder.foodTitle}</span>
                </div>
                <div class="order-info order-infor-price">
                  <span class="price-txt">Price: ${formatPrice(newOrder.foodPrice)}</span>
                </div>
                ${divFoodNote}
              </div>
            </div>
        `;
  orderContainer.appendChild(el);
}

function appendUpdatedOrder(updatedOrder) {
  const orderEl = document.getElementById(updatedOrder._id);
  orderEl.querySelector(
    ".food-amount-txt"
  ).innerHTML = `${updatedOrder.foodQty}`;
  if (updatedOrder.foodNote) {
    orderEl.querySelector(
      ".note-txt"
    ).innerHTML = `${updatedOrder.foodNote}`;
  }
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
  document.getElementById("popup-username").classList.add("open");
} else {
  document.getElementById("popup-username").classList.remove("open");
  socket.emit("old-user", roomName, cookieUserName);
}

function confirmUserName() {
  if(txtuserName.validity.valid) {
    userName = txtuserName.value;
    document.getElementById("popup-username").classList.remove("open");
    setCookie("userName", userName, 1);
    // appendLog('You joined')
    socket.emit("new-user", roomName, userName);
  }else {
    alert('Nhập tên dôôôôô')
  }
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
const bgColorsBody = ["#fce38ac4", "#F38181", "#9999fb", "#ffe797", "#cffff1"];
const menu = body.querySelector(".menu");
const menuItems = menu.querySelectorAll(".menu__item");
// const menuBorder = menu.querySelector(".menu__border");
let activeItem = menu.querySelector(".active");

function clickItem(item, index) {
  menu.style.removeProperty("--timeOut");
  if (activeItem == item) return;
  if (activeItem) {
    activeItem.classList.remove("active");
  }
  item.classList.add("active");
  body.style.backgroundColor = bgColorsBody[index];
  activeItem = item;
  // offsetMenuBorder(activeItem, menuBorder);
}

// function offsetMenuBorder(element, menuBorder) {
//     const offsetActiveItem = element.getBoundingClientRect();
//     const left = Math.floor(offsetActiveItem.left - menu.offsetLeft - (menuBorder.offsetWidth  - offsetActiveItem.width) / 2) +  "px";
//     menuBorder.style.transform = `translate3d(${left}, 0 , 0)`;
// }

// offsetMenuBorder(activeItem, menuBorder);

menuItems.forEach((item, index) => {
  item.addEventListener("click", () => clickItem(item, index));
});

function formatPrice(value) {
  return value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
}

window.addEventListener("resize", () => {
  // offsetMenuBorder(activeItem, menuBorder);
  menu.style.setProperty("--timeOut", "none");
});
window.addEventListener("load", () => {
  body.style.backgroundColor = bgColorsBody[0];
  body.style.backdropFilter = "brightness(90%)";
});

