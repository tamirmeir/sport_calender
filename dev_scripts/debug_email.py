
import os
import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv('backend/.env')

smtp_server = os.getenv('MAIL_SERVER')
smtp_port = int(os.getenv('MAIL_PORT'))
smtp_user = os.getenv('MAIL_USERNAME')
smtp_pass = os.getenv('MAIL_PASSWORD')
sender_email = os.getenv('MAIL_SENDER_EMAIL')
recipient = os.getenv('MAIL_REDIRECT_TO')

print(f"Connecting to {smtp_server}:{smtp_port}...")
print(f"User: {smtp_user}")
print(f"Sender: {sender_email}")
print(f"Recipient: {recipient}")

msg = MIMEText("This is a test email from the diagnostics script.")
msg['Subject'] = "Brevo SMTP Test"
msg['From'] = f"Matchday Team <{sender_email}>"
msg['To'] = recipient

try:
    with smtplib.SMTP(smtp_server, smtp_port) as server:
        server.set_debuglevel(1)  # Show communication
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(sender_email, [recipient], msg.as_string())
    print("\nSUCCESS: Email accepted by Brevo.")
except Exception as e:
    print(f"\nFAILURE: {e}")
