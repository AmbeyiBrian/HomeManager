from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'rent', views.RentPaymentViewSet)
router.register(r'mpesa', views.MpesaPaymentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
