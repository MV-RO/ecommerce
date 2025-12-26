document.addEventListener("DOMContentLoaded", () => {

  document.querySelectorAll(".cart").forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();

      const product = btn.closest(".pro");

      const item = {
        id: product.querySelector("img").src,
        name: product.querySelector("h5").innerText,
        price: parseInt(product.querySelector("h4").innerText.replace("₹", "")),
        image: product.querySelector("img").src,
        quantity: 1
      };

      let cart = JSON.parse(localStorage.getItem("cart")) || [];
      const exists = cart.find(p => p.id === item.id);

      exists ? exists.quantity++ : cart.push(item);
      localStorage.setItem("cart", JSON.stringify(cart));

      alert("✅ Added to cart");
    });
  });

  loadCartItems();
});

// ================= LOAD CART =================
function loadCartItems() {
  const table = document.querySelector("#cart table");
  if (!table) return;

  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  table.querySelector("tbody")?.remove();

  const tbody = document.createElement("tbody");
  let subtotal = 0;

  cart.forEach((item, index) => {
    const total = item.price * item.quantity;
    subtotal += total;

    tbody.innerHTML += `
      <tr>
        <td><img src="${item.image}" width="60"></td>
        <td>${item.name}</td>
        <td>₹${item.price}</td>
        <td>
          <input type="number" min="1" value="${item.quantity}"
          onchange="updateQuantity(${index}, this.value)">
        </td>
        <td>₹${total}</td>
        <td>
          <button onclick="removeItem(${index})">❌</button>
        </td>
      </tr>
    `;
  });

  table.appendChild(tbody);
  updateTotals(subtotal);
}

// ================= UPDATE QUANTITY =================
function updateQuantity(index, qty) {
  let cart = JSON.parse(localStorage.getItem("cart"));
  cart[index].quantity = parseInt(qty);
  localStorage.setItem("cart", JSON.stringify(cart));
  loadCartItems();
}

// ================= REMOVE ITEM =================
function removeItem(index) {
  let cart = JSON.parse(localStorage.getItem("cart"));
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  loadCartItems();
}

// ======== TOTALS & COUPONS =================
let discountAmount = 0;

function updateTotals(subtotal) {
  document.getElementById("cartSubtotal").innerText = `₹${subtotal}`;
  document.getElementById("cartDiscount").innerText = `₹${discountAmount}`;
  document.getElementById("cartTotal").innerText = `₹${subtotal - discountAmount}`;
}

function applyCoupon() {
    const code = document.getElementById("couponCode").value.toUpperCase();
    const msg = document.getElementById("couponMsg");

    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    let subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (code === "SAVE10") {
        discountAmount = Math.floor(subtotal * 0.1);
        msg.innerText = "✅ Coupon applied (10% OFF)";
        msg.style.color = "green";
    } 
    else if (code === "FLAT100" && subtotal >= 1000) {
        discountAmount = 100;
        msg.innerText = "✅ ₹100 discount applied";
        msg.style.color = "green";
    } 
    else if (code === "MV60"){
        discountAmount = Math.floor(subtotal * 0.6);
        msg.innerText = "✅ Coupon applied (60% OFF)";
        msg.style.color = "green";
    }
    else {
        discountAmount = 0;
        msg.innerText = "❌ Invalid coupon";
        msg.style.color = "red";
    }

    updateTotals(subtotal);
}

// ================= PLACE ORDER =================
function placeOrder() {

  const orderData = {
    customer: {
      name: document.getElementById("custName").value,
      email: document.getElementById("custEmail").value,
      phone: document.getElementById("custPhone").value
    },
    address: {
      address: document.getElementById("custAddress").value,
      city: document.getElementById("custCity").value,
      pincode: document.getElementById("custPincode").value
    },
    cart: JSON.parse(localStorage.getItem("cart")) || [],
    payment: document.querySelector("input[name='payment']:checked").value
  };

  fetch("http://localhost:3000/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderData)
  })
  .then(res => res.json())
  .then(data => {
    alert("✅ Order placed successfully!");
    closeCheckout();
    document.querySelectorAll(".checkout-step").forEach(s =>
      s.classList.remove("active"));
    document.getElementById("step-1").classList.add("active");

    localStorage.clear();
    loadCartItems();
  })
  .catch(err => {
    console.error(err);
    alert("❌ Order failed");
  });
}

/************ CLEAR CART & COUPONS ****************/

function clearCart() {
    // Remove cart data
    localStorage.removeItem("cart");

    // Remove coupon data
    localStorage.removeItem("appliedCoupon");
    localStorage.removeItem("discountAmount");

    // Reset discount variable
    discountAmount = 0;

    // Clear coupon UI
    const couponInput = document.getElementById("couponCode");
    const couponMsg = document.getElementById("couponMsg");

    if (couponInput) couponInput.value = "";
    if (couponMsg) couponMsg.innerText = "";

    // Reload cart & update header count
    loadCartItems();
    updateCartCount();
}


/**************** CHECKOUT MODAL ****************/

function openCheckout() {
  const modal = document.getElementById("checkoutModal");
  if (modal) {
    modal.style.display = "flex";
    loadOrderSummary();
  }
}

function closeCheckout() {
  document.getElementById("checkoutModal").style.display = "none";
}

function goToStep(step,valid = true){
  const currentStep = document.querySelector(".checkout-step.active");
  const requiredFields = currentStep.querySelectorAll(
    "input[required], textarea[required], select[required]"
  );

  let isValid = true;

  requiredFields.forEach(field => {
    field.classList.remove("error");

    if (!field.value.trim()) {
      isValid = false;
      field.classList.add("error");
    }

    // Pincode validation (India: 6 digits)
    if (field.id === "custPincode" && field.value.trim()) {
      if (!/^\d{6}$/.test(field.value.trim())) {
        isValid = false;
        field.classList.add("error");
        alert("Please enter a valid 6-digit pincode.");
      }
    }
  });

  if (!isValid) {
    alert("Please fill all delivery details correctly.");
    return;
  }

  document.querySelectorAll(".checkout-step").forEach(s =>
    s.classList.remove("active")
  );
  document.getElementById(`step-${step}`).classList.add("active");
}

function prevStep(step) {
  nextStep(step);
}

/**************** ORDER SUMMARY ****************/

function loadOrderSummary() {
  const summary = document.getElementById("orderSummary");
  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  summary.innerHTML = "";
  let total = 0;

  cart.forEach(item => {
    total += item.price * item.quantity;
    summary.innerHTML += `
      <p>
        ${item.name} × ${item.quantity}
        <strong>₹${item.price * item.quantity}</strong>
      </p>
    `;
  });

  summary.innerHTML += `<hr><h3>Total: ₹${total}</h3>`;
}

/**************** PAYMENT TOGGLE ****************/

document.addEventListener("change", e => {
  if (e.target.name === "payment") {
    document.getElementById("cardBox").style.display =
      e.target.value === "card" ? "block" : "none";

    document.getElementById("upiBox").style.display =
      e.target.value === "upi" ? "block" : "none";
  }
});
