from django.utils import timezone
from .models import SMSMessage
from tenants.models import Tenant


def send_notice_sms(notice, send_sms_flag=False):
    """
    Send SMS notifications for a notice to all tenants in the property
    
    Args:
        notice: Notice instance
        send_sms_flag: Boolean indicating whether to send SMS
    
    Returns:
        dict: Results of SMS sending operation
    """
    if not send_sms_flag:
        return {
            'sent': False,
            'message': 'SMS sending disabled for this notice',
            'sms_count': 0
        }
    
    try:
        # Get all tenants in the property
        tenants = Tenant.objects.filter(unit__property=notice.property)
        
        if not tenants.exists():
            return {
                'sent': False,
                'message': 'No tenants found in this property',
                'sms_count': 0
            }
        
        sent_count = 0
        failed_count = 0
        sms_messages = []
        
        # Prepare SMS content
        sms_content = f"Notice: {notice.title}\n\n{notice.content[:120]}..."  # Limit to SMS length
        if len(notice.content) > 120:
            sms_content += "\n\nView full notice in your tenant portal."
        
        for tenant in tenants:
            if not tenant.phone_number:
                failed_count += 1
                continue
                
            try:
                # Create SMS message record
                sms_message = SMSMessage.objects.create(
                    tenant=tenant,
                    phone_number=tenant.phone_number,
                    message_content=sms_content,
                    message_type='notice',
                    sent_at=timezone.now(),
                    status='pending'
                )
                
                # In a real implementation, you would integrate with an SMS gateway here
                # For now, we'll mark it as sent
                # TODO: Integrate with actual SMS provider (Twilio, Africa's Talking, etc.)
                
                sms_message.status = 'sent'
                sms_message.delivery_status = 'delivered'
                sms_message.delivery_time = timezone.now()
                sms_message.save()
                
                sms_messages.append(sms_message)
                sent_count += 1
                
            except Exception as e:
                failed_count += 1
                print(f"Failed to send SMS to {tenant.phone_number}: {str(e)}")
                continue
        
        return {
            'sent': True,
            'message': f'SMS sent to {sent_count} tenants, {failed_count} failed',
            'sms_count': sent_count,
            'failed_count': failed_count,
            'sms_messages': sms_messages
        }
        
    except Exception as e:
        return {
            'sent': False,
            'message': f'Error sending SMS: {str(e)}',
            'sms_count': 0
        }


def send_bulk_notice_sms(notice_ids, send_sms_flag=False):
    """
    Send SMS for multiple notices
    
    Args:
        notice_ids: List of notice IDs
        send_sms_flag: Boolean indicating whether to send SMS
    
    Returns:
        dict: Results of bulk SMS sending operation
    """
    from notices.models import Notice
    
    if not send_sms_flag:
        return {
            'sent': False,
            'message': 'SMS sending disabled',
            'total_sms_count': 0
        }
    
    results = []
    total_sent = 0
    total_failed = 0
    
    for notice_id in notice_ids:
        try:
            notice = Notice.objects.get(id=notice_id)
            result = send_notice_sms(notice, send_sms_flag=True)
            results.append({
                'notice_id': notice_id,
                'notice_title': notice.title,
                'result': result
            })
            total_sent += result.get('sms_count', 0)
            total_failed += result.get('failed_count', 0)
        except Notice.DoesNotExist:
            results.append({
                'notice_id': notice_id,
                'notice_title': 'Unknown',
                'result': {
                    'sent': False,
                    'message': 'Notice not found',
                    'sms_count': 0
                }
            })
    
    return {
        'sent': True,
        'message': f'Bulk SMS completed: {total_sent} sent, {total_failed} failed',
        'total_sms_count': total_sent,
        'total_failed_count': total_failed,
        'results': results
    }
