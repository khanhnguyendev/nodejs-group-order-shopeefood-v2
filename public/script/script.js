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

// Send oder
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
    foodImage: document.getElementById("txtFoodImage").innerText,
    foodPrice: document.getElementById("txtFoodPrice").innerText,
    orderTime: getCurrentTime(),
    foodQty: document.getElementById("txtFoodQty").value,
    foodNote: document.getElementById("txtNote").value,
  };
  socket.emit("order", orderDetail);
  closePopupConfirmOrder();
}

// Edit Order
function updateOrder() {
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
    orderId: document.getElementById("orderId").value,
    orderTime: getCurrentTime(),
    foodQty: document.getElementById("uptFoodQty").value,
    foodNote: document.getElementById("uptFoodNote").value,
  };
  socket.emit("update", orderDetail);
  closePopupUpdateOrder();
}

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

// Popup confirm order
function showPopupConfirmOrder(e) {
  document.getElementsByClassName("modal-container")[0].className += " open";
  document.getElementById("popup-confirm").style.display = "block";

  // Fill form
  document.getElementById("txtFoodName").innerHTML =
    e.getAttribute("data-title");
  document.getElementById("txtFoodPrice").innerHTML = formatPrice(
    Number(e.getAttribute("data-price"))
  );
  document.getElementById("txtFoodDes").innerHTML =
    e.getAttribute("data-des").length == 0
      ? `No description`
      : e.getAttribute("data-des");
  document.getElementById("txtFoodImage").innerHTML =
    e.getAttribute("data-image");
}

// Popup update order
function showPopupUpdateOrder(e) {
  document.getElementsByClassName("modal-container")[0].className += " open";
  document.getElementById("popup-update").style.display = "block";

  // Fill form
  document.getElementById("uptFoodName").innerHTML =
    e.getAttribute("data-title");
  document.getElementById("uptFoodPrice").innerHTML =
    e.getAttribute("data-price");
  document.getElementById("orderId").value = e.getAttribute("data-id");
}

function closePopupConfirmOrder() {
  document.getElementById("txtNote").value = "";
  document.getElementById("txtFoodQty").value = "1";
  document
    .getElementsByClassName("modal-container")[0]
    .classList.remove("open");
  document.getElementById("popup-confirm").style.display = "none";
}

function closePopupUpdateOrder() {
  document.getElementById("txtNote").value = "";
  document.getElementById("txtFoodQty").value = "1";
  document
    .getElementsByClassName("modal-container")[0]
    .classList.remove("open");
  document.getElementById("popup-update").style.display = "none";
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
        `${orderResult.newOrder.orderUser} ordered`,
        `${orderResult.newOrder.foodTitle}`
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
        `${updatedResult.updatedOrder.orderUser} updated`,
        `${updatedResult.updatedOrder.foodTitle}`
      );
      break;

    case PERMISSION_DENIED:
      // notify delete status
      notify(TOASTR_ERROR, `Update Failed`, `Bạn không có quyền`);
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
        `${deleteResult.order.orderUser} deleted`,
        `${deleteResult.order.foodTitle}`
      );
      break;

    case PERMISSION_DENIED:
      // notify delete status
      notify(TOASTR_ERROR, `Delete Failed`, `Bạn không có quyền`);
      break;

    default:
      notify(TOASTR_ERROR, "Delete Failed", "Something went wrong");
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
      const existing = acc.find((item) => item.foodTitle === curr.foodTitle);

      if (existing) {
        existing.foodQty += curr.foodQty;
        existing.totalPrice += curr.foodPrice;
        existing.foodNote.push({
          userName: curr.orderUser,
          note: curr.foodNote,
          id: curr._id,
        });
      } else {
        acc.push({
          foodTitle: curr.foodTitle,
          foodNote: [
            {
              userName: curr.orderUser,
              note: curr.foodNote,
              id: curr._id,
            },
          ],
          foodQty: curr.foodQty,
          totalPrice: curr.foodPrice,
        });
      }

      return acc;
    }, []);

    summaryOrders.forEach((order, index) => {
      const el = document.createElement("div");
      el.classList.add("summary-detail");
      let noteIndex = this.checkExistNote(order.foodNote);
      let content = "";
      content = `
      <div class="summary-detail">
        <div class="summary-detail--content">
          <div class="summary-info">
              <span class="sum-qty-txt">${order.foodQty}</span>
              <span class="sum-food-txt">${order.foodTitle}</span>
              `;
      if (noteIndex !== -1) {
        order.foodNote.forEach((note, index) => {
          if (index === 0) {
            content += `
                <div class="note-wrapper"
                  <span>Note: </span>`;
            content += `<div class="btn-primary expand-button"
                data-bs-toggle="collapse" 
                data-bs-target="#sum-${index}" 
                aria-expanded="false" 
                aria-controls="sum-${index}">`;
          }
          if (note.note) {
            if (index > noteIndex) {
              content += ",";
            }
            content += `${note.userName}`;
          }

          if (index === order.foodNote.length - 1) {
            content += `</div></div>`;
          }
        });
      }

      content += `
                </div>
                <div class="sum-total-txt">
                  <span>${formatPrice(order.totalPrice)}</span>
                </div>
              </div>`;
      content += `
            <div class="expand-content">
              <div class="collapse multi-collapse" id="sum-${index}">
                <div class="sum-user-note">`;
      if (order.foodNote.length !== 0) {
        order.foodNote.forEach((note) => {
          if (note.note) {
            content += `<p id="${note.id}">${note.userName} : ${note.note} </p>`;
          }
        });
      }
      content += `
            </div>
          </div>
        </div>
      </div>
     `;
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
  // el.setAttribute("onclick", "confirmDelete(this)");
  // el.setAttribute("data-room-id", newOrder.roomId);
  // el.setAttribute("data-delivery-id", newOrder.deliveryId);

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
                src="${newOrder.foodImage}">
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
                  <span class="price-txt">Price: ${formatPrice(
                    newOrder.foodPrice
                  )}</span>
                </div>
                ${divFoodNote}
              </div>
              <div class="order-option">
                <img src="/assets/edit-ico.png" class="edit-order" alt="edit" 
                data-id="${newOrder._id}" data-title="${
    newOrder.foodTitle
  }" data-price="${newOrder.foodPrice}" data-qty="${newOrder.foodQty}"
                onclick="showPopupUpdateOrder(this)"">
                <img src="/assets/delete-ico.png" class="delete-order" alt="delete" 
                  onclick="confirmDelete(this)" id="${newOrder._id}" 
                  data-room-id="${newOrder.roomId}" data-delivery-id="${
    newOrder.deliveryId
  }">
              </div>
            </div>
        `;
  orderContainer.appendChild(el);
}

function checkExistNote(item) {
  return item.findIndex((x) => x.note !== "");
}
function appendUpdatedOrder(updatedOrder) {
  const orderEl = document.getElementById(updatedOrder._id);
  orderEl.querySelector(
    ".food-amount-txt"
  ).innerHTML = `${updatedOrder.foodQty}`;
  if (updatedOrder.foodNote) {
    orderEl.querySelector(".note-txt").innerHTML = `${updatedOrder.foodNote}`;
  }
}

// Display popup define username
if (cookieUserName == null || cookieUserName.length < 1) {
  document.getElementById("popup-username").classList.add("open");
} else {
  document.getElementById("popup-username").classList.remove("open");
  socket.emit("old-user", roomName, cookieUserName);
}

function confirmUserName() {
  const maxLengthName = 25;
  let name = txtuserName.value.length;
  if (txtuserName.validity.valid && name <= maxLengthName) {
    const errorMsg = document.querySelector(".error");
    if (errorMsg) {
      errorMsg.remove();
    }
    userName = txtuserName.value;
    document.getElementById("popup-username").classList.remove("open");
    setCookie("userName", userName, 1);
    socket.emit("new-user", roomName, userName);
    notify(TOASTR_SUCCESS, `Hé lô ${userName}`);
  } else {
    const errorElement = document.createElement("span");
    errorElement.classList.add("error");
    let errorMessage = "";
    if (name > maxLengthName) {
      errorMessage = "Tên gì mà dài thòng. Nhập lại đi";
    }
    if (!txtuserName.validity.valid) {
      errorMessage = "Nhập tên dôôôôôô";
    }
    errorElement.innerHTML = errorMessage;
    let inputNameError = document
      .querySelector(".group-input-name")
      .querySelector(".error");
    if (inputNameError) {
      inputNameError.innerHTML = errorMessage;
    } else {
      document.querySelector(".group-input-name").append(errorElement);
    }
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
function notify(type, mainMessage = null, subMessage = null) {
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
  return value.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
}

window.addEventListener("resize", () => {
  // offsetMenuBorder(activeItem, menuBorder);
  menu.style.setProperty("--timeOut", "none");
});
window.addEventListener("load", () => {
  body.style.backgroundColor = bgColorsBody[0];
  body.style.backdropFilter = "brightness(90%)";
});
