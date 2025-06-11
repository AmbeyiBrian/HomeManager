from django.contrib import admin
from .models import Dashboard, Report, PropertyMetric, PaymentAnalytics, SMSAnalytics

@admin.register(Dashboard)
class DashboardAdmin(admin.ModelAdmin):
    list_display = ('name', 'organization', 'owner', 'is_default', 'created_at')
    list_filter = ('organization', 'is_default')
    search_fields = ('name', 'description', 'owner__username', 'owner__email')
    date_hierarchy = 'created_at'
    readonly_fields = ('created_at', 'updated_at')

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('name', 'organization', 'report_type', 'format', 'created_at')
    list_filter = ('organization', 'report_type', 'format')
    search_fields = ('name', 'description')
    date_hierarchy = 'created_at'
    readonly_fields = ('created_at',)

@admin.register(PropertyMetric)
class PropertyMetricAdmin(admin.ModelAdmin):
    list_display = ('property', 'period_start', 'period_end', 'occupancy_rate', 'revenue', 'expenses')
    list_filter = ('property', 'period_start', 'period_end')
    search_fields = ('property__name',)
    date_hierarchy = 'period_end'

@admin.register(PaymentAnalytics)
class PaymentAnalyticsAdmin(admin.ModelAdmin):
    list_display = ('organization', 'period', 'total_collected', 'on_time_percentage', 'average_days_late')
    list_filter = ('organization', 'period')
    search_fields = ('organization__name', 'period')

@admin.register(SMSAnalytics)
class SMSAnalyticsAdmin(admin.ModelAdmin):
    list_display = ('organization', 'period', 'sms_count', 'delivery_rate', 'tenant_response_rate', 'cost')
    list_filter = ('organization', 'period')
    search_fields = ('organization__name', 'period')
