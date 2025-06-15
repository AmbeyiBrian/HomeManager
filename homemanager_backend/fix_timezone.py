"""
One-time script to fix naive datetimes in the database.
This script will update all DateTimeField values to be timezone-aware
using the timezone specified in settings (Africa/Nairobi).
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'homemanager_backend.settings')
django.setup()

from django.db import connection
from django.utils import timezone
from payments.models import RentPayment
from sms.models import SMSMessage

def fix_naive_datetimes():
    print("Starting datetime timezone fix...")
    
    # Fix RentPayment.payment_date
    payments_fixed = 0
    for payment in RentPayment.objects.all():
        if payment.payment_date and timezone.is_naive(payment.payment_date):
            payment.payment_date = timezone.make_aware(payment.payment_date)
            payment.save(update_fields=['payment_date'])
            payments_fixed += 1
    
    print(f"Fixed {payments_fixed} naive datetimes in RentPayment.payment_date")
    
    # Fix SMSMessage.sent_at and delivery_time
    sms_sent_at_fixed = 0
    sms_delivery_time_fixed = 0
    
    for message in SMSMessage.objects.all():
        fields_to_update = []
        
        if message.sent_at and timezone.is_naive(message.sent_at):
            message.sent_at = timezone.make_aware(message.sent_at)
            fields_to_update.append('sent_at')
            sms_sent_at_fixed += 1
        
        if message.delivery_time and timezone.is_naive(message.delivery_time):
            message.delivery_time = timezone.make_aware(message.delivery_time)
            fields_to_update.append('delivery_time')
            sms_delivery_time_fixed += 1
        
        if fields_to_update:
            message.save(update_fields=fields_to_update)
    
    print(f"Fixed {sms_sent_at_fixed} naive datetimes in SMSMessage.sent_at")
    print(f"Fixed {sms_delivery_time_fixed} naive datetimes in SMSMessage.delivery_time")
    
    print("Timezone fix completed!")

if __name__ == "__main__":
    fix_naive_datetimes()
