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

## 🔄 Running with PM2  

You can use **PM2** to keep the script running in the background and restart it automatically.  
That's how I do in my VPS:

### Install PM2 (if you haven't already):  
```sh
npm install -g pm2
```

### Add your app to PM2:  
Create a configuration file named `ecosystem.config.js` and add the following content:

```js
module.exports = {
  apps: [
    {
      name: "kindle-newsletter",
      script: "npm",
      args: "run start",
      cwd: "YOUR/PATH", // Script path like: /root/kindle-newsletter
      instances: 1,
      autorestart: false, // We already have retry control at the code
      cron_restart: "15 6 * * 1-6", // Executes every 6:15 AM (MON - SAT)
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
```

### Start your app with PM2:  
```sh
pm2 start ecosystem.config.js
```

### Save the process so it restarts after a reboot:  
```sh
pm2 save
pm2 startup
```

### Useful PM2 Commands:
- **List running processes:**  
  ```sh
  pm2 list
  ```
- **Restart the app manually:**  
  ```sh
  pm2 restart kindle-newsletter
  ```
- **Stop the app:**  
  ```sh
  pm2 stop kindle-newsletter
  ```
- **Delete the app from PM2:**  
  ```sh
  pm2 delete kindle-newsletter
  ```

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