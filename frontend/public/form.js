const form = document.getElementById("userForm");

form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "Processing...";

    try {
        const formData = new FormData(form);

        const userData = {
            name: formData.get("name"),
            occupation: formData.get("occupation"),
            description: formData.get("description"),
            achievement1: formData.get("achievement1"),
            achievement2: formData.get("achievement2"),
            achievement3: formData.get("achievement3"),
            businessEmail: formData.get("bus-email"),
            phone: formData.get("phone"),
            personalEmail: formData.get("per-email"),
            youtube: formData.get("youtube"),
            instagram: formData.get("instagram"),
            x: formData.get("x"),
            linkedin: formData.get("linkedin"),
            facebook: formData.get("facebook")
        };

        console.log("Creating payment order...");
        console.log(userData);

        // 🔥 Step 1: Create Razorpay Order
        const orderResponse = await fetch("/create-order", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(userData)
        });

        const orderData = await orderResponse.json();

        if (!orderResponse.ok) {
            throw new Error(orderData.message || "Failed to create payment order.");
        }

        // 🔥 Step 2: Razorpay Checkout Options
        const options = {
            key: orderData.keyId,
            amount: orderData.amount,
            currency: orderData.currency,
            name: "Xevonet ECard",
            description: "Digital Business Card",
            order_id: orderData.orderId,

            handler: async function (response) {
                try {
                    console.log("Payment success response:", response);

                    // 🔥 Step 3: Verify Payment
                    const verifyResponse = await fetch("/verify-payment", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            userData: userData
                        })
                    });

                    const verifyData = await verifyResponse.json();

                    if (!verifyResponse.ok) {
                        throw new Error(verifyData.message || "Payment verification failed.");
                    }

                    console.log("Payment verified + card created:", verifyData);

                    // 🔥 Redirect to card
                    window.location.href = verifyData.cardURL;

                } catch (error) {
                    console.error("Verification error:", error);
                    alert(error.message || "Payment succeeded, but verification failed.");
                    resetButton();
                }
            },

            prefill: {
                name: userData.name,
                email: userData.personalEmail,
                contact: userData.phone
            },

            theme: {
                color: "#111111"
            },

            modal: {
                ondismiss: function () {
                    console.log("Payment popup closed");
                    resetButton();
                }
            }
        };

        // 🔥 Step 4: Open Razorpay
        const razorpay = new Razorpay(options);
        razorpay.open();

    } catch (error) {
        console.error("Checkout error:", error);
        alert(error.message || "Something went wrong while starting payment.");
        resetButton();
    }

    // 🔄 Reset Button Helper
    function resetButton() {
        submitButton.disabled = false;
        submitButton.textContent = "Pay & Create My Card";
    }
});