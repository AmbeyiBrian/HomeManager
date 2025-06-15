"""
Script to inspect datetime values directly in the database.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'homemanager_backend.settings')
django.setup()

from django.db import connection

def inspect_db_datetimes():
    print("Inspecting datetime fields in the database...")
    
    with connection.cursor() as cursor:
        # Check RentPayment.payment_date
        cursor.execute("""
            SELECT COUNT(*) 
            FROM payments_rentpayment 
            WHERE payment_date IS NOT NULL
        """)
        total_payments = cursor.fetchone()[0]
        print(f"Total rent payments with payment_date: {total_payments}")
        
        # Check SMSMessage.sent_at
        cursor.execute("""
            SELECT COUNT(*) 
            FROM sms_smsmessage 
            WHERE sent_at IS NOT NULL
        """)
        total_sms = cursor.fetchone()[0]
        print(f"Total SMS messages with sent_at: {total_sms}")

if __name__ == "__main__":
    inspect_db_datetimes()
