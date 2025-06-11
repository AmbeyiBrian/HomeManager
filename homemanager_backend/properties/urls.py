from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import views_qr

router = DefaultRouter()
router.register(r'properties', views.PropertyViewSet)
router.register(r'property-images', views.PropertyImageViewSet)
router.register(r'units', views.UnitViewSet)
router.register(r'qr-codes', views.QRCodeViewSet)
router.register(r'mpesa-configs', views.MpesaConfigViewSet)
router.register(r'property-mpesa-configs', views.PropertyMpesaConfigViewSet)

urlpatterns = [
    path('', include(router.urls)),
    # New QR code endpoints for bulk operations
    path('qr-codes/bulk/', views_qr.bulk_qr_codes, name='bulk-qr-codes'),
    path('properties/<int:pk>/qr-codes/', views_qr.property_qr_codes, name='property-qr-codes'),
]
