from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'dashboards', views.DashboardViewSet)
router.register(r'reports', views.ReportViewSet)
router.register(r'property-metrics', views.PropertyMetricViewSet)
router.register(r'payment-analytics', views.PaymentAnalyticsViewSet)
router.register(r'sms-analytics', views.SMSAnalyticsViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
