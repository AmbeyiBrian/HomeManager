from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Avg, Count
from .models import Dashboard, Report, PropertyMetric, PaymentAnalytics, SMSAnalytics
from .serializers import (
    DashboardSerializer, ReportSerializer, PropertyMetricSerializer,
    PaymentAnalyticsSerializer, SMSAnalyticsSerializer
)
from properties.models import Property
from payments.models import RentPayment
from sms.models import SMSMessage

class DashboardViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing Dashboard instances"""
    queryset = Dashboard.objects.all()
    serializer_class = DashboardSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter dashboards to only show those for the user's organization"""
        user = self.request.user
        if user.is_superuser:
            return Dashboard.objects.all()
        
        # Filter by owner if provided
        owner_id = self.request.query_params.get('owner', None)
        is_default = self.request.query_params.get('is_default', None)
        
        queryset = Dashboard.objects.all()
        
        if user.organization:
            queryset = queryset.filter(organization=user.organization)
        else:
            return Dashboard.objects.none()
        
        if owner_id:
            queryset = queryset.filter(owner_id=owner_id)
        
        if is_default is not None:
            is_default_bool = is_default.lower() == 'true'
            queryset = queryset.filter(is_default=is_default_bool)
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        """Set owner and organization when creating a dashboard"""
        serializer.save(
            owner=self.request.user,
            organization=self.request.user.organization
        )
        
    @action(detail=False, methods=['get'])
    def summary_data(self, request):
        """Get summary data for the dashboard"""
        user = request.user
        if not user.organization:
            return Response({'error': 'No organization found'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get counts of properties, units, tenants, and maintenance tickets
        org = user.organization
        property_count = Property.objects.filter(organization=org).count()
        
        # Get units data - total and occupied
        from properties.models import Unit
        units = Unit.objects.filter(property__organization=org)
        unit_count = units.count()
        occupied_count = units.filter(is_occupied=True).count()
        
        # Vacancy rate
        vacancy_rate = 0
        if unit_count > 0:
            vacancy_rate = round(((unit_count - occupied_count) / unit_count) * 100, 2)
        
        # Get tenant count
        from tenants.models import Tenant
        tenant_count = Tenant.objects.filter(unit__property__organization=org).count()
        
        # Get maintenance tickets
        from maintenance.models import Ticket
        tickets = Ticket.objects.filter(property__organization=org)
        open_tickets = tickets.exclude(status__in=['resolved', 'closed']).count()
        
        # Get recent payment data
        today = timezone.now().date()
        recent_payments = RentPayment.objects.filter(
            unit__property__organization=org,
            status='completed',
            payment_date__gte=today - timezone.timedelta(days=30)
        )
        payment_sum = recent_payments.aggregate(total=Sum('amount'))['total'] or 0
        
        # Get SMS stats
        recent_sms = SMSMessage.objects.filter(
            tenant__unit__property__organization=org,
            sent_at__gte=today - timezone.timedelta(days=30)
        )
        sms_count = recent_sms.count()
        delivered_count = recent_sms.filter(delivery_status='delivered').count()
        delivery_rate = 0
        if sms_count > 0:
            delivery_rate = round((delivered_count / sms_count) * 100, 2)
            
        # Return all stats
        return Response({
            'property_count': property_count,
            'unit_count': unit_count,
            'occupied_count': occupied_count,
            'vacancy_rate': vacancy_rate,
            'tenant_count': tenant_count,
            'open_tickets': open_tickets,
            'recent_payment_sum': payment_sum,
            'recent_sms_count': sms_count,
            'sms_delivery_rate': delivery_rate
        })

class ReportViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing Report instances"""
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter reports to only show those for the user's organization"""
        user = self.request.user
        if user.is_superuser:
            return Report.objects.all()
        
        # Filter by report_type if provided
        report_type = self.request.query_params.get('report_type', None)
        format_param = self.request.query_params.get('format', None)
        
        queryset = Report.objects.all()
        
        if user.organization:
            queryset = queryset.filter(organization=user.organization)
        else:
            return Report.objects.none()
        
        if report_type:
            queryset = queryset.filter(report_type=report_type)
        
        if format_param:
            queryset = queryset.filter(format=format_param)
            
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        """Set organization when creating a report"""
        serializer.save(organization=self.request.user.organization)
    
    @action(detail=True, methods=['get'])
    def generate(self, request, pk=None):
        """Generate the report data"""
        report = self.get_object()
        
        # In a real implementation, we would generate the report here
        # For now, just return some sample data based on the report type
        
        if report.report_type == 'occupancy':
            # Get properties and calculate occupancy rate
            properties = Property.objects.filter(organization=request.user.organization)
            
            from properties.models import Unit
            data = []
            for prop in properties:
                units = Unit.objects.filter(property=prop)
                total = units.count()
                occupied = units.filter(is_occupied=True).count()
                
                if total > 0:
                    occupancy_rate = round((occupied / total) * 100, 2)
                else:
                    occupancy_rate = 0
                    
                data.append({
                    'property_name': prop.name,
                    'total_units': total,
                    'occupied_units': occupied,
                    'occupancy_rate': occupancy_rate
                })
            
            return Response({
                'title': report.name,
                'type': 'occupancy',
                'data': data
            })
            
        elif report.report_type == 'financials':
            # Get financial data by property
            properties = Property.objects.filter(organization=request.user.organization)
            
            today = timezone.now().date()
            start_date = today.replace(day=1)  # First day of current month
            end_date = (today.replace(day=1) + timezone.timedelta(days=32)).replace(day=1) - timezone.timedelta(days=1)  # Last day of current month
            
            data = []
            for prop in properties:
                payments = RentPayment.objects.filter(
                    unit__property=prop,
                    status='completed',
                    payment_date__date__gte=start_date,
                    payment_date__date__lte=end_date
                )
                
                revenue = payments.aggregate(total=Sum('amount'))['total'] or 0
                
                # In a real implementation, we would get expenses from expense tracking
                # For now, use a placeholder
                expenses = 0
                
                data.append({
                    'property_name': prop.name,
                    'revenue': revenue,
                    'expenses': expenses,
                    'profit': revenue - expenses
                })
            
            return Response({
                'title': report.name,
                'type': 'financials',
                'period': f"{start_date.strftime('%b %d, %Y')} to {end_date.strftime('%b %d, %Y')}",
                'data': data
            })
            
        else:
            # For other report types, return a placeholder
            return Response({
                'title': report.name,
                'type': report.report_type,
                'message': f"{report.get_report_type_display()} report generation not implemented yet"
            })

class PropertyMetricViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing PropertyMetric instances"""
    queryset = PropertyMetric.objects.all()
    serializer_class = PropertyMetricSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter property metrics to only show those for the user's organization"""
        user = self.request.user
        if user.is_superuser:
            return PropertyMetric.objects.all()
        
        # Filter by property and date range if provided
        property_id = self.request.query_params.get('property', None)
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        
        queryset = PropertyMetric.objects.all()
        
        if user.organization:
            queryset = queryset.filter(property__organization=user.organization)
        else:
            return PropertyMetric.objects.none()
        if property_id:
            queryset = queryset.filter(property_id=property_id)
            
        if start_date:
            queryset = queryset.filter(period_end__gte=start_date)
        
        if end_date:
            queryset = queryset.filter(period_start__lte=end_date)
            
        return queryset.order_by('-period_end')
    
    @action(detail=False, methods=['get'])
    def summary_data(self, request):
        """Get aggregated property metrics summary for mobile dashboard"""
        user = request.user
        if not user.organization:
            return Response({'error': 'No organization found'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get all properties for the organization
        from properties.models import Unit
        from maintenance.models import Ticket
        
        org = user.organization
        properties = Property.objects.filter(organization=org)
        
        # Calculate unit statistics
        units = Unit.objects.filter(property__organization=org)
        total_units = units.count()
        occupied_units = units.filter(is_occupied=True).count()
        vacant_units = total_units - occupied_units
        
        # For maintenance units, we can check if there are open maintenance tickets for units
        maintenance_units = units.filter(
            tickets__status__in=['new', 'assigned', 'in_progress']
        ).distinct().count()
        
        # Calculate ticket statistics
        tickets = Ticket.objects.filter(property__organization=org)
        open_tickets = tickets.filter(status__in=['new', 'assigned']).count()
        in_progress_tickets = tickets.filter(status='in_progress').count()
        completed_tickets = tickets.filter(status='completed').count()
        closed_tickets = tickets.filter(status='closed').count()
        return Response({
            'total_properties': properties.count(),
            'total_units': total_units,
            'total_occupied_units': occupied_units,
            'total_vacant_units': vacant_units,
            'total_maintenance_units': maintenance_units,
            'occupancy_rate': round((occupied_units / total_units * 100) if total_units > 0 else 0, 2),
            'open_tickets': open_tickets,
            'in_progress_tickets': in_progress_tickets,
            'completed_tickets': completed_tickets,
            'closed_tickets': closed_tickets,
        })

class PaymentAnalyticsViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing PaymentAnalytics instances"""
    queryset = PaymentAnalytics.objects.all()
    serializer_class = PaymentAnalyticsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter payment analytics to only show those for the user's organization"""
        user = self.request.user
        if user.is_superuser:
            return PaymentAnalytics.objects.all()
        
        # Filter by period if provided
        period = self.request.query_params.get('period', None)
        
        queryset = PaymentAnalytics.objects.all()
        
        if user.organization:
            queryset = queryset.filter(organization=user.organization)
        else:
            return PaymentAnalytics.objects.none()
        
        if period:
            queryset = queryset.filter(period=period)
            return queryset.order_by('-period')
    
    @action(detail=False, methods=['get'])
    def summary_data(self, request):
        """Get aggregated payment analytics summary for mobile dashboard"""
        user = request.user
        if not user.organization:
            return Response({'error': 'No organization found'}, status=status.HTTP_400_BAD_REQUEST)
        
        org = user.organization
        today = timezone.now().date()
        
        # Get all payments for the organization
        all_payments = RentPayment.objects.filter(unit__property__organization=org)
        
        # Calculate payment statistics
        total_expected = all_payments.filter(status__in=['pending', 'completed', 'overdue']).aggregate(
            total=Sum('amount'))['total'] or 0
        total_collected = all_payments.filter(status='completed').aggregate(
            total=Sum('amount'))['total'] or 0
        total_pending = all_payments.filter(status='pending').aggregate(
            total=Sum('amount'))['total'] or 0
        total_overdue = all_payments.filter(status='overdue').aggregate(
            total=Sum('amount'))['total'] or 0
        
        # Calculate monthly revenue for the last 6 months
        monthly_revenue = []
        for i in range(6):
            month_start = (today.replace(day=1) - timezone.timedelta(days=31*i)).replace(day=1)
            month_end = (month_start + timezone.timedelta(days=31)).replace(day=1) - timezone.timedelta(days=1)
            
            month_total = all_payments.filter(
                status='completed',
                payment_date__gte=month_start,
                payment_date__lte=month_end
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            monthly_revenue.append({
                'month': month_start.strftime('%b'),
                'amount': float(month_total)
            })
        
        # Reverse to get chronological order
        monthly_revenue.reverse()
        
        return Response({
            'total_expected': float(total_expected),
            'total_collected': float(total_collected),
            'total_pending': float(total_pending),
            'total_overdue': float(total_overdue),
            'collection_rate': round((total_collected / total_expected * 100) if total_expected > 0 else 0, 2),
            'monthly_revenue': monthly_revenue,
        })

class SMSAnalyticsViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing SMSAnalytics instances"""
    queryset = SMSAnalytics.objects.all()
    serializer_class = SMSAnalyticsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter SMS analytics to only show those for the user's organization"""
        user = self.request.user
        if user.is_superuser:
            return SMSAnalytics.objects.all()
        
        # Filter by period if provided
        period = self.request.query_params.get('period', None)
        
        queryset = SMSAnalytics.objects.all()
        
        if user.organization:
            queryset = queryset.filter(organization=user.organization)
        else:
            return SMSAnalytics.objects.none()
        
        if period:
            queryset = queryset.filter(period=period)
            
        return queryset.order_by('-period')
