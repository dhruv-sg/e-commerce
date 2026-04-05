const emailBoilerplate = (title, content, settings) => {
    const brandName = settings?.brandName || "Yogi Fashion";
    const address = settings?.address || "123 Fashion Street, Mumbai, Maharashtra 400001";
    const mobileNumber = settings?.mobileNumber || "+91-9876543210";

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; border-radius: 0 !important; }
            .content { padding: 20px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f1e8; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #1a1a1a;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table class="container" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 0; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.03);">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 40px 0; background-color: #ffffff;">
                            <span style="font-size: 24px; font-weight: 700; color: #0a3d30; letter-spacing: 1px; text-transform: uppercase; font-family: 'Times New Roman', serif;">${brandName}</span>
                        </td>
                    </tr>
                    <!-- Body Content -->
                    ${content}
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 40px; background-color: #f5f1e8; text-align: center; border-top: 1px solid #e5e0d5;">
                            <p style="margin: 0; font-size: 13px; color: #1a1a1a; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">
                                &copy; 2026 ${brandName}. All rights reserved.
                            </p>
                            <p style="margin: 10px 0 0 0; font-size: 12px; color: #666666;">
                                ${address}
                            </p>
                            <p style="margin: 5px 0 0 0; font-size: 11px; color: #999;">
                                Support: ${mobileNumber}
                            </p>
                            <div style="margin-top: 25px;">
                                <a href="#" style="text-decoration: none; color: #0a3d30; font-size: 12px; margin: 0 15px; font-weight: 600;">Shop</a>
                                <a href="#" style="text-decoration: none; color: #0a3d30; font-size: 12px; margin: 0 15px; font-weight: 600;">About</a>
                                <a href="#" style="text-decoration: none; color: #0a3d30; font-size: 12px; margin: 0 15px; font-weight: 600;">Contact</a>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;
};

exports.otpTemplate = (otp, settings) => {
    const brandName = settings?.brandName || "Yogi Fashion";
    const content = `
    <tr>
        <td class="content" style="padding: 40px; color: #1a1a1a;">
            <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 700; text-align: center; text-transform: uppercase; color: #0a3d30;">Reset Your Password</h1>
            <p style="margin: 0 0 30px 0; font-size: 15px; line-height: 1.6; text-align: center; color: #4b5563;">
                We received a request to reset your password for ${brandName}. Use the verification code below to proceed.
            </p>
            <div style="background-color: #f9f9f9; border: 1px solid #0a3d30; padding: 25px; text-align: center;">
                <span style="font-size: 32px; font-weight: 800; letter-spacing: 12px; color: #0a3d30;">${otp}</span>
            </div>
            <p style="margin: 30px 0 30px 0; font-size: 13px; text-align: center; color: #ef4444; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                Valid for 10 minutes only.
            </p>
            <div style="text-align: center; margin-bottom: 20px;">
                <a href="https://e-com-uav2.onrender.com/reset-password" style="display: inline-block; padding: 15px 40px; background-color: #0a3d30; color: #ffffff; text-decoration: none; font-weight: 700; border-radius: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Reset Password</a>
            </div>
            <p style="margin: 40px 0 0 0; font-size: 13px; line-height: 1.6; color: #666666; text-align: center; border-top: 1px solid #f1f1f1; padding-top: 20px;">
                <strong>Security:</strong> Do not share this OTP with anyone. Our support team will never call you asking for this code.
            </p>
        </td>
    </tr>
    `;
    return emailBoilerplate('Reset Your Password', content, settings);
};

exports.orderConfirmationTemplate = (order, settings) => {
    const brandName = settings?.brandName || "Yogi Fashion";
    const businessAddress = settings?.address || "123 Fashion Street, Mumbai, Maharashtra 400001";
    const gstin = settings?.gstin || "";

    const productRows = order.items.map(item => `
        <tr>
            <td style="padding: 15px 0; border-bottom: 1px solid #f1f1f1;">
                <p style="margin: 0; font-size: 14px; font-weight: 700; color: #1a1a1a;">${item.name}</p>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #666666; text-transform: uppercase; letter-spacing: 0.5px;">Qty: ${item.quantity} | ${item.color || ''} ${item.size || ''}</p>
            </td>
            <td align="right" style="padding: 15px 0; border-bottom: 1px solid #f1f1f1; font-size: 14px; font-weight: 700; color: #0a3d30;">
                ₹${item.price * item.quantity}
            </td>
        </tr>
    `).join('');

    const content = `
    <tr>
        <td class="content" style="padding: 40px; color: #1a1a1a;">
            <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #0a3d30; text-transform: uppercase;">Order Confirmed 🎉</h1>
            <p style="margin: 0 0 30px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">Thank you for your purchase from ${brandName}. We've received your order and are getting it ready for shipment.</p>
            
            <div style="background-color: #ffffff; border: 1px solid #e5e0d5; padding: 25px; margin-bottom: 30px;">
                <p style="margin: 0 0 20px 0; font-size: 12px; color: #666666; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; border-bottom: 2px solid #0a3d30; display: inline-block; padding-bottom: 4px;">Order ID: #${order._id.toString().slice(-6).toUpperCase()}</p>
                
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    ${productRows}
                    <tr>
                        <td style="padding-top: 25px; font-size: 15px; font-weight: 700; color: #1a1a1a; text-transform: uppercase;">Total Amount</td>
                        <td align="right" style="padding-top: 25px; font-size: 18px; font-weight: 800; color: #0a3d30;">₹${order.total}</td>
                    </tr>
                </table>
            </div>

            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px; border-collapse: separate; border-spacing: 0 10px;">
                <tr>
                    <td style="background-color: #f9f9f9; padding: 20px; border-left: 4px solid #0a3d30; width: 48%;">
                        <h3 style="margin: 0 0 12px 0; font-size: 11px; font-weight: 700; color: #0a3d30; text-transform: uppercase; letter-spacing: 1px;">Ship From:</h3>
                        <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #1a1a1a;">
                            <strong>${brandName}</strong><br>
                            ${businessAddress}<br>
                            ${gstin ? `GSTIN: ${gstin}` : ''}
                        </p>
                    </td>
                    <td style="width: 4%;"></td>
                    <td style="background-color: #f9f9f9; padding: 20px; border-left: 4px solid #4b5563; width: 48%;">
                        <h3 style="margin: 0 0 12px 0; font-size: 11px; font-weight: 700; color: #4b5563; text-transform: uppercase; letter-spacing: 1px;">Ship To:</h3>
                        <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #1a1a1a;">
                            <strong>${order.shippingAddress.street}</strong><br>
                            ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.zip}<br>
                            Ph: ${order.shippingAddress.phone}
                        </p>
                    </td>
                </tr>
            </table>

            <div style="text-align: center;">
                <a href="https://e-com-uav2.onrender.com/my-orders/${order._id}" style="display: inline-block; padding: 15px 40px; background-color: #0a3d30; color: #ffffff; text-decoration: none; font-weight: 700; border-radius: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Track My Order</a>
            </div>
        </td>
    </tr>
    `;
    return emailBoilerplate('Order Confirmed', content, settings);
};

exports.orderStatusUpdateTemplate = (order, status, settings) => {
    const brandName = settings?.brandName || "Yogi Fashion";
    let statusEmoji = '🚚';
    let statusColor = '#0a3d30';
    if (status === 'Delivered') { statusEmoji = '✨'; statusColor = '#0a3d30'; }
    if (status === 'Cancelled') { statusEmoji = '✕'; statusColor = '#ef4444'; }

    const content = `
    <tr>
        <td class="content" style="padding: 40px; color: #1a1a1a;">
            <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: ${statusColor}; text-transform: uppercase;">Order Update ${statusEmoji}</h1>
            <p style="margin: 0 0 35px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">Hello, we have an update on your ${brandName} order status.</p>
            
            <div style="border: 1px solid #e5e0d5; padding: 30px; margin-bottom: 35px; text-align: center; background-color: #ffffff;">
                <p style="margin: 0 0 15px 0; font-size: 12px; color: #666666; letter-spacing: 1px; text-transform: uppercase;">Order ID: #${order._id.toString().slice(-6).toUpperCase()}</p>
                <div style="display: inline-block; padding: 10px 24px; border: 2px solid ${statusColor}; color: ${statusColor}; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px;">
                    ${status}
                </div>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #1a1a1a;">
                    ${status === 'Shipped' ? 'Your package has been dispatched and is currently on its way' : ''}
                    ${status === 'Delivered' ? 'Your package has been delivered successfully. We hope you love it!' : ''}
                    ${status === 'Processing' ? 'We are currently hand-picking and packaging your items.' : ''}
                    ${status === 'Cancelled' ? 'Your order has been cancelled.' : ''}
                </p>
            </div>

            <div style="text-align: center;">
                <a href="https://e-com-uav2.onrender.com/my-orders/${order._id}" style="display: inline-block; padding: 15px 40px; background-color: #0a3d30; color: #ffffff; text-decoration: none; font-weight: 700; border-radius: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">View Order Details</a>
            </div>
        </td>
    </tr>
    `;
    return emailBoilerplate(`Order ${status}`, content, settings);
};

exports.welcomeNewsletterTemplate = (settings) => {
    const brandName = settings?.brandName || "Yogi Fashion";
    const content = `
    <tr>
        <td class="content" style="padding: 40px; color: #1a1a1a; text-align: center;">
            <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #0a3d30; text-transform: uppercase; font-family: 'Times New Roman', serif;">Experience Brilliance</h1>
            <p style="margin: 0 0 25px 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
                Thank you for joining <strong>${brandName}</strong>.
            </p>
            <p style="margin: 0 0 35px 0; font-size: 14px; color: #666666; line-height: 1.6;">
                You are now part of our inner circle and will receive priority access to our signature collections and exclusive launch events.
            </p>
            <div style="text-align: center; margin-bottom: 20px;">
                <a href="#" style="display: inline-block; padding: 15px 40px; background-color: #0a3d30; color: #ffffff; text-decoration: none; font-weight: 700; border-radius: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Visit Store</a>
            </div>
            <p style="margin: 40px 0 0 0; font-size: 12px; color: #999999; border-top: 1px solid #f1f1f1; padding-top: 20px;">
                You're receiving this because you subscribed to our newsletter at ${brandName}.
            </p>
        </td>
    </tr>
    `;
    return emailBoilerplate(`Welcome to ${brandName}`, content, settings);
};
