import os
from flask import Flask
from flask_mail import Mail, Message
from dotenv import load_dotenv

# Load key-values from .env file
load_dotenv()

app = Flask(__name__)

# Config
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS') == 'True'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_SENDER_EMAIL')

mail = Mail(app)

print("\n📧 Port 587 Brevo Email Tester 📧")
print("-----------------------------------")
print(f"Server:   {app.config['MAIL_SERVER']}")
print(f"Port:     {app.config['MAIL_PORT']}")
print(f"Username: {app.config['MAIL_USERNAME']}")
print(f"Sender:   {app.config['MAIL_DEFAULT_SENDER']}")
print("-----------------------------------")

if not app.config['MAIL_PASSWORD'] or "your_brevo" in app.config['MAIL_PASSWORD']:
    print("❌ Error: MAIL_PASSWORD is missing or default in .env")
    exit(1)

recipient = "4tamirmeir@gmail.com"

with app.app_context():
    try:
        print(f"\nSending to {recipient}...")
        msg = Message("Test Email from Sport Calendar",
                      recipients=[recipient],
                      body="Success! Your Brevo SMTP configuration is working correctly.")
        mail.send(msg)
        print("✅ Email sent successfully!")
    except Exception as e:
        print(f"\n❌ Failed to send email:\n{e}")
