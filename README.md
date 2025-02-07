# 📩 Auto Send "The News" to Kindle

This script **automatically converts** the latest post from [The News](https://thenewscc.beehiiv.com/) into `.epub` format and sends it to your Kindle.

⚠ **Disclaimer:** This script was created for **personal use only** and is not intended for selling, distributing, or sharing content from *The News* or *Waffle Company*.  
It modifies the original post, and you **cannot share the modified content** without permission from the newsletter owners.

---

## 🚀 How to Use

### 1️⃣ Configure the `.env` File  
Before running the script, you need to set up your environment variables:

- **Gmail Account**:  
  - Required if you use the default *nodemailer* configuration.
  - Must be **whitelisted** in your Kindle settings to receive emails.
- **Gmail App Password (SENDER_PASS)**:  
  - **Do not use** your Gmail password.  
  - Generate an **App Password** in your Google Account:  
    - 📌 **Important:** You must enable **2-Step Authentication** first.  
    - 🔗 [Generate an app password here](https://myaccount.google.com/apppasswords?pli=1)  

---

### 2️⃣ Install Dependencies & Run  
Run the following commands in your terminal:

```sh
npm install
npm run start
```

Alternatively, you can schedule it to run automatically.  
I personally use **PM2 cron** on my VPS.

---

## 🔧 Want to Customize It?  

You are free to **modify** or **use this script as inspiration** for your own projects.  
If you need help, feel free to contact me.  

### Possible Modifications:
✅ Change the newsletter source  
✅ Use a different email provider  
✅ Adjust formatting and output settings  

---

Enjoy! 😊 Happy reading on your Kindle!  